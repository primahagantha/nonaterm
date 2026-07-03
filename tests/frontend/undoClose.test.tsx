import { act, render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { UndoCloseToast } from '@/components/shell/UndoCloseToast';
import { useTerminalStore } from '@/stores/terminalStore';
import { useWorkspaceStore, defaultWorkspaces } from '@/stores/workspaceStore';

describe('closeWorkspace + UndoCloseToast', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces.map((w) => ({
        ...w,
        panes: w.panes.map((p) => ({ ...p })),
      })),
      recentlyClosed: [],
    });
    useTerminalStore.setState({ sessions: {} });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves a workspace into recentlyClosed on close and restores on undo', () => {
    render(<UndoCloseToast />);
    const targetId = defaultWorkspaces[0].id;
    act(() => {
      useWorkspaceStore.getState().closeWorkspace(targetId);
    });
    expect(useWorkspaceStore.getState().workspaces.length).toBe(
      defaultWorkspaces.length - 1,
    );
    expect(useWorkspaceStore.getState().recentlyClosed.length).toBe(1);
    expect(
      useWorkspaceStore.getState().recentlyClosed[0].workspace.id,
    ).toBe(targetId);

    act(() => {
      fireEvent.click(screen.getByTestId('undo-close-workspace'));
    });
    expect(useWorkspaceStore.getState().workspaces.length).toBe(
      defaultWorkspaces.length,
    );
    expect(useWorkspaceStore.getState().recentlyClosed.length).toBe(0);
  });

  it('refuses to close the last workspace', () => {
    useWorkspaceStore.setState({
      activeWorkspaceId: 'solo',
      workspaces: [
        {
          id: 'solo',
          name: 'Solo',
          accentColor: '#000',
          layoutPreset: '1',
          panes: [{ id: 'p1', title: 'P', cwd: '', startupCommand: '' }],
        },
      ],
    });
    const entry = useWorkspaceStore.getState().closeWorkspace('solo');
    expect(entry).toBeNull();
    expect(useWorkspaceStore.getState().workspaces.length).toBe(1);
  });

  it('dismisses the toast on timer expiry', () => {
    render(<UndoCloseToast />);
    act(() => {
      useWorkspaceStore.getState().closeWorkspace(defaultWorkspaces[0].id);
    });
    expect(screen.getByTestId('undo-close-workspace')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(useWorkspaceStore.getState().recentlyClosed.length).toBe(0);
  });

  it('caps the recentlyClosed buffer to MAX_RECENTLY_CLOSED', () => {
    render(<UndoCloseToast />);
    act(() => {
      const first = useWorkspaceStore.getState().workspaces[0].id;
      useWorkspaceStore.getState().closeWorkspace(first);
    });
    act(() => {
      const remaining = useWorkspaceStore.getState().workspaces[0].id;
      useWorkspaceStore.getState().closeWorkspace(remaining);
    });
    expect(useWorkspaceStore.getState().recentlyClosed.length).toBe(1);
  });

  it('renders a progress bar with role="progressbar" while active', () => {
    render(<UndoCloseToast />);
    act(() => {
      useWorkspaceStore.getState().closeWorkspace(defaultWorkspaces[1].id);
    });
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
    expect(progress.getAttribute('aria-valuenow')).toMatch(/^\d+$/);
  });

  it('dismisses immediately on Esc without waiting for timer', () => {
    render(<UndoCloseToast />);
    act(() => {
      useWorkspaceStore.getState().closeWorkspace(defaultWorkspaces[1].id);
    });
    expect(useWorkspaceStore.getState().recentlyClosed.length).toBe(1);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(useWorkspaceStore.getState().recentlyClosed.length).toBe(0);
  });
});
