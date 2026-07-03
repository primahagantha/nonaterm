import { useEffect, useRef } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { reportError } from '@/lib/errorHandler';
import {
  configGetAppInfo,
  isTauriRuntime,
  onWindowClosed,
  onWindowOpened,
  stateGetRecoveryStatus,
  stateInitDb,
  stateMarkCleanShutdown,
  stateSaveSnapshot,
  systemGetDiagnostics,
  systemHealthCheck,
  workspaceList,
  workspaceListWindows,
} from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** Hook bootstrap untuk sync data awal dari backend saat app siap. */
export function useAppBootstrap() {
  const bootstrappedRef = useRef(false);
  const hydrateFromSummaries = useWorkspaceStore(
    (state) => state.hydrateFromSummaries,
  );
  const hydrateSettings = useSettingsStore(
    (state) => state.hydrateFromBackend,
  );
  const migrateKeybinds = useSettingsStore(
    (state) => state.migrateKeybindsFromLocalStorage,
  );
  const setAppInfo = useUiStore((state) => state.setAppInfo);
  const setDiagnostics = useUiStore((state) => state.setDiagnostics);
  const setBackendStatus = useUiStore((state) => state.setBackendStatus);
  const setRecoveryStatus = useUiStore((state) => state.setRecoveryStatus);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    async function bootstrap() {
      setBackendStatus('loading');

      if (!isTauriRuntime()) {
        setBackendStatus('fallback');
        // Browser mode: load from localStorage
        try {
          const saved = localStorage.getItem('nonaterm:workspace-snapshot');
          if (saved) {
            const snapshot = JSON.parse(saved);
            if (snapshot.workspaces?.length > 0) {
              useWorkspaceStore.getState().hydrateFromSnapshot(
                snapshot.activeWorkspaceId,
                snapshot.workspaces,
              );
            }
          }
        } catch {
          // ignore corrupt data
        }
        return;
      }

      try {
        await stateInitDb();

        const [health, appInfo, workspaces, diagnostics, recovery] =
          await Promise.all([
            systemHealthCheck(),
            configGetAppInfo(),
            workspaceList(),
            systemGetDiagnostics(),
            stateGetRecoveryStatus(),
          ]);

        if (health.status !== 'ok') {
          throw new Error(`Unexpected backend status: ${health.status}`);
        }

        setAppInfo(appInfo);
        setDiagnostics(diagnostics);
        if (recovery.snapshot && recovery.snapshot.workspaces.length > 0) {
          // Always prefer the snapshot when present (clean or dirty)
          // so we render the real pane titles + cwd, not placeholders.
          useWorkspaceStore
            .getState()
            .hydrateFromSnapshot(
              recovery.snapshot.activeWorkspaceId,
              recovery.snapshot.workspaces,
            );
        } else {
          hydrateFromSummaries(workspaces);
        }
        if (recovery.dirtyShutdown) {
          setRecoveryStatus(recovery);
        }
        // Pull persisted keybind overrides + passthrough pane list
        // dari backend. Jika SQLite punya data, dia menang dari
        // localStorage (cross-device sync). Best-effort: kalau
        // gagal, tetap pakai localStorage state.
        const hydrateResult = await hydrateSettings();
        if (
          !hydrateResult &&
          Object.keys(useSettingsStore.getState().keybindOverrides).length > 0
        ) {
          // localStorage punya override, SQLite kosong → first-boot
          // backfill. v1 users yang customize sebelum SQLite ada
          // akan ter-migrate sekali. Aman untuk diulang: clear all
          // dulu lalu push semua entry yang sekarang.
          void migrateKeybinds();
        }
        setBackendStatus('ready');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown bootstrap error';
        setBackendStatus('error', message);
      }
    }

    void bootstrap();
  }, [
    hydrateFromSummaries,
    hydrateSettings,
    migrateKeybinds,
    setAppInfo,
    setBackendStatus,
    setDiagnostics,
    setRecoveryStatus,
  ]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let lastSnapshot = '';
    const interval = window.setInterval(() => {
      const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
      const snapshot = JSON.stringify({ activeWorkspaceId, workspaces });

      if (snapshot === lastSnapshot) {
        return;
      }

      lastSnapshot = snapshot;
      void stateSaveSnapshot({
        activeWorkspaceId,
        workspaces,
        savedAt: new Date().toISOString(),
      }).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('disk') || msg.includes('full') || msg.includes('space')) {
          reportError('DISK_FULL');
        } else if (msg.includes('locked') || msg.includes('busy')) {
          reportError('SQLITE_BUSY');
        } else if (msg.includes('corrupt')) {
          reportError('SQLITE_CORRUPT');
        } else {
          reportError('STATE_CORRUPT', { message: msg });
        }
      });
    }, 5000);

    const markClean = () => {
      void stateMarkCleanShutdown();
    };

    window.addEventListener('beforeunload', markClean);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', markClean);
      markClean();
    };
  }, []);

  // Browser mode: autosave to localStorage
  useEffect(() => {
    if (isTauriRuntime()) return;

    let lastSnapshot = '';
    const interval = window.setInterval(() => {
      const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
      const snapshot = JSON.stringify({ activeWorkspaceId, workspaces });
      if (snapshot === lastSnapshot) return;
      lastSnapshot = snapshot;
      try {
        localStorage.setItem('nonaterm:workspace-snapshot', snapshot);
      } catch {
        // quota exceeded
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  // Subscribe ke event multi-window: saat user detach workspace
  // atau window di-close, sync UI store dengan registry backend.
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const refreshWindows = () => {
      void workspaceListWindows()
        .then((windows) => useUiStore.getState().setOpenWindows(windows))
        .catch(() => undefined);
    };

    const unlisteners: UnlistenFn[] = [];
    let cancelled = false;

    void Promise.all([
      onWindowOpened(({ workspaceId, windowLabel }) => {
        useUiStore.getState().upsertWindow({
          label: windowLabel,
          title: `Nonaterm — ${workspaceId}`,
          workspaceId,
        });
        refreshWindows();
      }),
      onWindowClosed(({ windowLabel }) => {
        useUiStore.getState().removeWindow(windowLabel);
      }),
    ]).then(([unlistenOpen, unlistenClose]) => {
      if (cancelled) {
        unlistenOpen();
        unlistenClose();
        return;
      }
      unlisteners.push(unlistenOpen, unlistenClose);
      // Initial pull supaya UI reflect window apa pun yang sudah
      // terbuka sebelum listener ini terpasang.
      refreshWindows();
    });

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);
}
