import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** Banner non-blocking yang menawarkan pilihan recovery setelah dirty shutdown. */
export function RecoveryBanner() {
  const recoveryStatus = useUiStore((state) => state.recoveryStatus);
  const setRecoveryStatus = useUiStore((state) => state.setRecoveryStatus);
  const hydrateFromSnapshot = useWorkspaceStore(
    (state) => state.hydrateFromSnapshot,
  );

  useEffect(() => {
    if (!recoveryStatus?.dirtyShutdown) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setRecoveryStatus(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [recoveryStatus, setRecoveryStatus]);

  if (!recoveryStatus?.dirtyShutdown) {
    return null;
  }

  const handleRestore = () => {
    if (recoveryStatus.snapshot) {
      hydrateFromSnapshot(
        recoveryStatus.snapshot.activeWorkspaceId,
        recoveryStatus.snapshot.workspaces,
      );
    }
    setRecoveryStatus(null);
  };

  const handleDismiss = () => {
    setRecoveryStatus(null);
  };

  return (
    <section
      className="recovery-toast"
      role="status"
      aria-label="Session recovery"
    >
      <span className="recovery-toast__text">
        Previous session ended unexpectedly.
      </span>
      <div className="recovery-toast__actions">
        <button
          type="button"
          className="recovery-toast__btn"
          onClick={handleRestore}
          title="Restore previous session"
        >
          Restore
        </button>
        <button
          type="button"
          className="recovery-toast__btn recovery-toast__btn--close"
          onClick={handleDismiss}
          aria-label="Dismiss recovery (Esc)"
          title="Dismiss (Esc)"
        >
          ✕
        </button>
      </div>
    </section>
  );
}
