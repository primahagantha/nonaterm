import { useEffect, useState } from 'react';
import { useWorkspaceStore, type RecentlyClosed } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';

const TOAST_DURATION_MS = 6000;

/**
 * Toast that appears when a workspace is closed. Shows a countdown
 * progress bar and an Undo button that restores the workspace from
 * the store's recentlyClosed buffer. Multiple toasts are queued
 * FIFO. `Esc` dismisses the active toast early.
 */
export function UndoCloseToast() {
  const recentlyClosed = useWorkspaceStore((state) => state.recentlyClosed);
  const restore = useWorkspaceStore((state) => state.restoreRecentlyClosed);
  const dismiss = useWorkspaceStore((state) => state.dismissRecentlyClosed);
  const sessions = useTerminalStore((state) => state.sessions);
  const [active, setActive] = useState<RecentlyClosed | null>(null);
  const [remaining, setRemaining] = useState(TOAST_DURATION_MS);

  useEffect(() => {
    if (active) {
      return;
    }
    const next = recentlyClosed[0];
    if (next) {
      setActive(next);
      setRemaining(TOAST_DURATION_MS);
    }
  }, [recentlyClosed, active]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, TOAST_DURATION_MS - elapsed);
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(tick);
        dismiss(active.closedAt);
        setActive(null);
      }
    }, 250);
    const escHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        window.clearInterval(tick);
        dismiss(active.closedAt);
        setActive(null);
      }
    };
    window.addEventListener('keydown', escHandler);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('keydown', escHandler);
    };
  }, [active, dismiss]);

  if (!active) {
    return null;
  }

  const { workspace } = active;
  const runningCount = workspace.panes.filter((pane) => {
    const status = sessions[pane.id]?.status;
    return status === 'running' || status === 'spawning';
  }).length;
  const seconds = Math.ceil(remaining / 1000);
  const progressPct = (remaining / TOAST_DURATION_MS) * 100;

  const handleUndo = () => {
    try {
      restore(active.closedAt);
    } catch (error) {
      console.warn('[UndoCloseToast] Failed to restore workspace:', error);
    }
    setActive(null);
  };

  return (
    <div className="undo-toast" role="status" aria-label="Workspace closed">
      <span className="undo-toast__text">
        Closed workspace <strong>"{workspace.name}"</strong>
        {runningCount > 0 ? ` (${runningCount} running)` : ''}.
      </span>
      <span
        className="undo-toast__progress"
        role="progressbar"
        aria-valuenow={seconds}
        aria-valuemin={0}
        aria-valuemax={Math.ceil(TOAST_DURATION_MS / 1000)}
        aria-label={`Undo available for ${seconds} seconds`}
      >
        <span
          className="undo-toast__progress-bar"
          style={{ width: `${progressPct}%` }}
        />
      </span>
      <button
        type="button"
        className="btn btn--sm btn--primary"
        onClick={handleUndo}
        data-testid="undo-close-workspace"
      >
        Undo ({seconds}s)
      </button>
      <button
        type="button"
        className="undo-toast__dismiss"
        onClick={() => {
          dismiss(active.closedAt);
          setActive(null);
        }}
        aria-label="Dismiss undo (Esc)"
        title="Dismiss (Esc)"
      >
        ✕
      </button>
    </div>
  );
}
