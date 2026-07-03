import { render, screen } from '@testing-library/react';
import { performance } from 'node:perf_hooks';
import { TerminalGrid } from '@/components/terminal/TerminalGrid';
import { useTerminalStore } from '@/stores/terminalStore';
import type { Workspace } from '@/types/workspace';

vi.mock('@/components/terminal/XtermTerminal', () => ({
  XtermTerminal: ({ paneId }: { paneId: string }) => (
    <div data-testid={`xterm-${paneId}`} />
  ),
}));

function buildNinePaneWorkspace(): Workspace {
  return {
    id: 'workspace-load',
    name: 'Load Harness',
    accentColor: '#7c3aed',
    layoutPreset: '9',
    panes: Array.from({ length: 9 }, (_, index) => ({
      id: `pane-${index + 1}`,
      title: `Pane ${index + 1}`,
      cwd: '',
      startupCommand: '',
    })),
  };
}

describe('multi-pane render/load harness', () => {
  beforeEach(() => {
    useTerminalStore.setState({ sessions: {} });
  });

  it('renders a 9-pane grid without excessive jsdom overhead', async () => {
    const workspace = buildNinePaneWorkspace();
    const startedAt = performance.now();

    render(<TerminalGrid workspace={workspace} />);
    const elapsedMs = performance.now() - startedAt;

    for (const pane of workspace.panes) {
      expect(await screen.findByTestId(`pane-${pane.id}`)).toBeInTheDocument();
    }

    expect(elapsedMs).toBeLessThan(400);
  });

  it('updates 9 active sessions without approaching idle bookkeeping budget', () => {
    const workspace = buildNinePaneWorkspace();

    for (const pane of workspace.panes) {
      useTerminalStore.getState().startSession(pane.id, workspace.id);
    }

    const startedAt = performance.now();

    for (let pass = 0; pass < 500; pass += 1) {
      for (const pane of workspace.panes) {
        useTerminalStore.getState().markOutput(pane.id);
      }
    }

    expect(performance.now() - startedAt).toBeLessThan(100);
  });
});
