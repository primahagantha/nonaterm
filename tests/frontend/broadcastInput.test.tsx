import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { BroadcastPanel } from '@/components/shell/BroadcastPanel';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';

function seedStores(runningPanes: string[] = ['p1', 'p2']) {
  useWorkspaceStore.setState({
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test WS',
        accentColor: '#3b82f6',
        layoutPreset: '2',
        panes: [
          { id: 'p1', title: 'Agent', cwd: '', startupCommand: '' },
          { id: 'p2', title: 'Dev UI', cwd: '', startupCommand: '' },
          { id: 'p3', title: 'Logs', cwd: '', startupCommand: '' },
        ],
      },
    ],
    activeWorkspaceId: 'ws-1',
  });

  const sessions: Record<string, { status: string }> = {};
  for (const paneId of runningPanes) {
    sessions[paneId] = { status: 'running' };
  }
  useTerminalStore.setState({ sessions: sessions as never });
}

describe('Broadcast Input', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: undefined });
    useTerminalStore.setState({ sessions: {} });
  });

  it('renders nothing when less than 2 running panes', () => {
    seedStores(['p1']);
    const { container } = render(<BroadcastPanel workspaceId="ws-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders panel when 2+ panes are running', () => {
    seedStores(['p1', 'p2']);
    render(<BroadcastPanel workspaceId="ws-1" />);
    expect(screen.getByText('Broadcast Input')).toBeVisible();
  });

  it('shows running panes as checkboxes', () => {
    seedStores(['p1', 'p2']);
    render(<BroadcastPanel workspaceId="ws-1" />);
    expect(screen.getByText('Agent')).toBeVisible();
    expect(screen.getByText('Dev UI')).toBeVisible();
  });

  it('has select all button', () => {
    seedStores(['p1', 'p2']);
    render(<BroadcastPanel workspaceId="ws-1" />);
    expect(screen.getByRole('button', { name: /select all/i })).toBeVisible();
  });

  it('has broadcast input field', () => {
    seedStores(['p1', 'p2']);
    render(<BroadcastPanel workspaceId="ws-1" />);
    expect(screen.getByLabelText('Broadcast command')).toBeVisible();
  });

  it('select all selects all running panes', () => {
    seedStores(['p1', 'p2']);
    render(<BroadcastPanel workspaceId="ws-1" />);

    fireEvent.click(screen.getByRole('button', { name: /select all/i }));

    const checkboxes = screen.getAllByRole('checkbox');
    for (const cb of checkboxes) {
      expect(cb).toBeChecked();
    }
  });

  it('send button shows count of selected panes', () => {
    seedStores(['p1', 'p2']);
    render(<BroadcastPanel workspaceId="ws-1" />);

    fireEvent.click(screen.getByRole('button', { name: /select all/i }));
    expect(screen.getByRole('button', { name: /send to 2/i })).toBeVisible();
  });
});
