import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AttentionInbox } from '@/components/shell/AttentionInbox';
import { useTerminalStore } from '@/stores/terminalStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function seedStores() {
  useWorkspaceStore.setState({
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test WS',
        accentColor: '#3b82f6',
        layoutPreset: '2',
        panes: [
          { id: 'pane-ok', title: 'Healthy', cwd: '', startupCommand: '' },
          { id: 'pane-err', title: 'Errored', cwd: '', startupCommand: '' },
          { id: 'pane-exit', title: 'Exited', cwd: '', startupCommand: '' },
        ],
      },
    ],
    activeWorkspaceId: 'ws-1',
  });

  useTerminalStore.setState({
    sessions: {
      'pane-ok': { status: 'running', errorMessage: undefined, exitCode: undefined } as never,
      'pane-err': { status: 'error', errorMessage: 'PTY spawn failed', exitCode: undefined } as never,
      'pane-exit': { status: 'exited', errorMessage: undefined, exitCode: 137 } as never,
    },
  });
}

describe('AttentionInbox', () => {
  beforeEach(() => {
    useTerminalStore.setState({ sessions: {} });
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: undefined });
  });

  it('returns null when no errored/exited sessions', () => {
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: 'ws-1',
          name: 'Test',
          accentColor: '#3b82f6',
          layoutPreset: '1',
          panes: [{ id: 'p1', title: 'OK', cwd: '', startupCommand: '' }],
        },
      ],
    });
    useTerminalStore.setState({
      sessions: { p1: { status: 'running' } as never },
    });

    const { container } = render(<AttentionInbox />);
    expect(container.firstChild).toBeNull();
  });

  it('shows badge count for errored terminals', () => {
    seedStores();
    render(<AttentionInbox />);

    const toggle = screen.getByRole('button', { name: /2 terminal.*need attention/i });
    expect(toggle).toBeVisible();
    expect(screen.getByText('2')).toBeVisible();
  });

  it('expands list on click and shows errored items', () => {
    seedStores();
    render(<AttentionInbox />);

    fireEvent.click(screen.getByRole('button', { name: /attention/i }));

    expect(screen.getByText('Errored')).toBeVisible();
    expect(screen.getByText('Exited')).toBeVisible();
    expect(screen.getByText(/PTY spawn failed/)).toBeVisible();
    expect(screen.getByText(/Exit 137/)).toBeVisible();
  });

  it('clicking an item calls setActiveWorkspace and setActivePane', () => {
    seedStores();
    render(<AttentionInbox />);

    fireEvent.click(screen.getByRole('button', { name: /attention/i }));
    fireEvent.click(screen.getByText('Errored'));

    const state = useWorkspaceStore.getState();
    expect(state.activeWorkspaceId).toBe('ws-1');
  });

  it('collapses list after clicking an item', () => {
    seedStores();
    render(<AttentionInbox />);

    fireEvent.click(screen.getByRole('button', { name: /attention/i }));
    fireEvent.click(screen.getByText('Errored'));

    expect(screen.queryByText('Exited')).not.toBeInTheDocument();
  });
});
