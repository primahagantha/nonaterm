import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryBanner } from '@/components/shell/RecoveryBanner';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { RecoveryStatus } from '@/types/ipc';

const dirtyRecovery: RecoveryStatus = {
  dirtyShutdown: true,
  hasSnapshot: true,
  lockfilePath: 'state/Nonaterm.lock',
  snapshotPath: 'state/workspace-snapshot.json',
  snapshot: {
    activeWorkspaceId: 'workspace-saved',
    workspaces: [
      {
        id: 'workspace-saved',
        name: 'Saved',
        accentColor: '#22c55e',
        layoutPreset: '1',
        panes: [{ id: 'pane-s1', title: 'S1', cwd: '', startupCommand: '' }],
      },
    ],
    savedAt: '2026-06-18T10:00:00.000Z',
  },
};

describe('RecoveryBanner', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
    useWorkspaceStore.setState({
      activeWorkspaceId: 'workspace-fresh',
      workspaces: [
        {
          id: 'workspace-fresh',
          name: 'Fresh',
          accentColor: '#ff00ff',
          layoutPreset: '1',
          panes: [{ id: 'pane-f1', title: 'F1', cwd: '', startupCommand: '' }],
        },
      ],
    });
  });

  it('renders nothing when no dirty shutdown', () => {
    useUiStore.getState().setRecoveryStatus(null);
    const { container } = render(<RecoveryBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders banner with restore and dismiss options on dirty shutdown', () => {
    useUiStore.getState().setRecoveryStatus(dirtyRecovery);
    render(<RecoveryBanner />);

    expect(screen.getByText('Restore')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /dismiss recovery/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Previous session ended unexpectedly/)).toBeInTheDocument();
  });

  it('hydrates from snapshot on restore and clears recovery status', () => {
    useUiStore.getState().setRecoveryStatus(dirtyRecovery);
    render(<RecoveryBanner />);

    fireEvent.click(screen.getByText('Restore'));

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      'workspace-saved',
    );
    expect(useWorkspaceStore.getState().workspaces[0].name).toBe('Saved');
    expect(useUiStore.getState().recoveryStatus).toBeNull();
  });

  it('dismisses without restoring snapshot', () => {
    useUiStore.getState().setRecoveryStatus(dirtyRecovery);
    render(<RecoveryBanner />);

    fireEvent.click(
      screen.getByRole('button', { name: /dismiss recovery/i }),
    );

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
      'workspace-fresh',
    );
    expect(useUiStore.getState().recoveryStatus).toBeNull();
  });

  it('dismisses on Esc key press', () => {
    useUiStore.getState().setRecoveryStatus(dirtyRecovery);
    render(<RecoveryBanner />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(useUiStore.getState().recoveryStatus).toBeNull();
  });
});
