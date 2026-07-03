import { render } from '@testing-library/react';
import { performance } from 'node:perf_hooks';
import { TerminalGrid } from '@/components/terminal/TerminalGrid';
import type { Workspace } from '@/types/workspace';

vi.mock('@/components/terminal/TerminalPanePlaceholder', () => ({
  TerminalPanePlaceholder: ({ paneId }: { paneId: string }) => (
    <div data-testid={paneId} />
  ),
}));

function buildWorkspace(): Workspace {
  return {
    id: 'workspace-stress',
    name: 'Stress',
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

describe('grid render stress', () => {
  it('renders a 9-pane grid repeatedly within a sane budget', () => {
    const startedAt = performance.now();

    for (let index = 0; index < 25; index += 1) {
      const { unmount } = render(<TerminalGrid workspace={buildWorkspace()} />);
      unmount();
    }

    expect(performance.now() - startedAt).toBeLessThan(2000);
  });
});
