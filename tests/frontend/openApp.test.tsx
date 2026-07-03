import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalPanePlaceholder } from '@/components/terminal/TerminalPanePlaceholder';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';

function seedStores() {
  useWorkspaceStore.setState({
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test WS',
        accentColor: '#3b82f6',
        layoutPreset: '2',
        panes: [
          { id: 'p1', title: 'Agent', cwd: '', startupCommand: '' },
        ],
      },
    ],
    activeWorkspaceId: 'ws-1',
  });
  useTerminalStore.setState({
    sessions: {
      p1: { status: 'running' } as never,
    },
  });
  useSettingsStore.setState({ passthroughPanes: [], passthroughByDefault: true });
}

describe('Pane Action Buttons', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: undefined });
    useTerminalStore.setState({ sessions: {} });
    useSettingsStore.setState({ passthroughPanes: [], passthroughByDefault: true });
  });

  it('renders passthrough toggle button in pane header', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const passthroughBtn = screen.getByRole('button', { name: /toggle passthrough/i });
    expect(passthroughBtn).toBeVisible();
  });

  it('renders restart button in pane header', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const restartBtn = screen.getByRole('button', { name: /restart pane/i });
    expect(restartBtn).toBeVisible();
  });

  it('renders remove button in pane header', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const removeBtn = screen.getByRole('button', { name: /remove this pane/i });
    expect(removeBtn).toBeVisible();
  });

  it('does not render duplicate open app button', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const openAppBtn = screen.queryByRole('button', { name: /open app/i });
    expect(openAppBtn).toBeNull();
  });
});
