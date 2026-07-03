import { renderHook, waitFor } from '@testing-library/react';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { useUiStore } from '@/stores/uiStore';
import { defaultWorkspaces, useWorkspaceStore } from '@/stores/workspaceStore';
import * as tauriApi from '@/lib/tauri';

describe('useAppBootstrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useUiStore.getState().reset();
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces,
    });
    vi.spyOn(tauriApi, 'onWindowOpened').mockResolvedValue(() => undefined);
    vi.spyOn(tauriApi, 'onWindowClosed').mockResolvedValue(() => undefined);
    vi.spyOn(tauriApi, 'workspaceListWindows').mockResolvedValue([]);
  });

  it('falls back cleanly outside Tauri runtime', async () => {
    vi.spyOn(tauriApi, 'isTauriRuntime').mockReturnValue(false);

    renderHook(() => useAppBootstrap());

    await waitFor(() => {
      expect(useUiStore.getState().backendStatus).toBe('fallback');
    });
  });

  it('hydrates app info and workspaces when Tauri runtime is available', async () => {
    vi.spyOn(tauriApi, 'isTauriRuntime').mockReturnValue(true);
    vi.spyOn(tauriApi, 'stateInitDb').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'stateGetRecoveryStatus').mockResolvedValue({
      dirtyShutdown: false,
      hasSnapshot: false,
      lockfilePath: 'state/Nonaterm.lock',
      snapshotPath: 'state/workspace-snapshot.json',
      snapshot: null,
    });
    vi.spyOn(tauriApi, 'stateMarkCleanShutdown').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'stateSaveSnapshot').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'systemHealthCheck').mockResolvedValue({
      status: 'ok',
      service: 'Nonaterm-backend',
      configFileName: 'config.json',
      supportedLayoutPresets: ['1', '2', '4', '6', '9'],
      ptyOutputEvent: 'pty:output',
      ptyExitEvent: 'pty:exit',
      workspaceChangedEvent: 'workspace:changed',
      autosaveTriggeredEvent: 'autosave:triggered',
    });
    vi.spyOn(tauriApi, 'configGetAppInfo').mockResolvedValue({
      name: 'Nonaterm',
      version: '0.1.0',
      platform: 'windows',
    });
    vi.spyOn(tauriApi, 'systemGetDiagnostics').mockResolvedValue({
      appDataDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm',
      logDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm\\logs',
      latestLogFile:
        'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm\\logs\\Nonaterm.log.2026-06-18',
      recentCrashReports: [],
    });
    vi.spyOn(tauriApi, 'workspaceList').mockResolvedValue([
      {
        id: 'workspace-new',
        name: 'New Workspace',
        accentColor: '#ff00ff',
        paneCount: 2,
      },
    ]);

    renderHook(() => useAppBootstrap());

    await waitFor(() => {
      expect(useUiStore.getState().backendStatus).toBe('ready');
    });

    expect(useUiStore.getState().appInfo?.name).toBe('Nonaterm');
    expect(useUiStore.getState().diagnostics?.logDir).toContain('logs');
    expect(useWorkspaceStore.getState().workspaces[0].id).toBe('workspace-new');
    expect(useWorkspaceStore.getState().workspaces[0].panes).toHaveLength(2);
  });

  it('surfaces bootstrap errors when backend health is unexpected', async () => {
    vi.spyOn(tauriApi, 'isTauriRuntime').mockReturnValue(true);
    vi.spyOn(tauriApi, 'stateInitDb').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'stateGetRecoveryStatus').mockResolvedValue({
      dirtyShutdown: false,
      hasSnapshot: false,
      lockfilePath: 'state/Nonaterm.lock',
      snapshotPath: 'state/workspace-snapshot.json',
      snapshot: null,
    });
    vi.spyOn(tauriApi, 'stateMarkCleanShutdown').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'stateSaveSnapshot').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'systemHealthCheck').mockResolvedValue({
      status: 'degraded',
      service: 'Nonaterm-backend',
      configFileName: 'config.json',
      supportedLayoutPresets: ['1', '2', '4', '6', '9'],
      ptyOutputEvent: 'pty:output',
      ptyExitEvent: 'pty:exit',
      workspaceChangedEvent: 'workspace:changed',
      autosaveTriggeredEvent: 'autosave:triggered',
    });
    vi.spyOn(tauriApi, 'configGetAppInfo').mockResolvedValue({
      name: 'Nonaterm',
      version: '0.1.0',
      platform: 'windows',
    });
    vi.spyOn(tauriApi, 'systemGetDiagnostics').mockResolvedValue({
      appDataDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm',
      logDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm\\logs',
      latestLogFile: null,
      recentCrashReports: [],
    });
    vi.spyOn(tauriApi, 'workspaceList').mockResolvedValue([]);

    renderHook(() => useAppBootstrap());

    await waitFor(() => {
      expect(useUiStore.getState().backendStatus).toBe('error');
    });

    expect(useUiStore.getState().bootstrapError).toContain(
      'Unexpected backend status',
    );
  });

  it('sets recovery status for banner when previous shutdown was dirty', async () => {
    vi.spyOn(tauriApi, 'isTauriRuntime').mockReturnValue(true);
    vi.spyOn(tauriApi, 'stateInitDb').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'stateGetRecoveryStatus').mockResolvedValue({
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
            layoutPreset: '2',
            panes: [
              { id: 'pane-s1', title: 'S1', cwd: '', startupCommand: '' },
              { id: 'pane-s2', title: 'S2', cwd: '', startupCommand: '' },
            ],
          },
        ],
        savedAt: '2026-06-18T10:00:00.000Z',
      },
    });
    vi.spyOn(tauriApi, 'stateMarkCleanShutdown').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'stateSaveSnapshot').mockResolvedValue(undefined);
    vi.spyOn(tauriApi, 'systemHealthCheck').mockResolvedValue({
      status: 'ok',
      service: 'Nonaterm-backend',
      configFileName: 'config.json',
      supportedLayoutPresets: ['1', '2', '4', '6', '9'],
      ptyOutputEvent: 'pty:output',
      ptyExitEvent: 'pty:exit',
      workspaceChangedEvent: 'workspace:changed',
      autosaveTriggeredEvent: 'autosave:triggered',
    });
    vi.spyOn(tauriApi, 'configGetAppInfo').mockResolvedValue({
      name: 'Nonaterm',
      version: '0.1.0',
      platform: 'windows',
    });
    vi.spyOn(tauriApi, 'systemGetDiagnostics').mockResolvedValue({
      appDataDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm',
      logDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm\\logs',
      latestLogFile: null,
      recentCrashReports: [],
    });
    vi.spyOn(tauriApi, 'workspaceList').mockResolvedValue([
      {
        id: 'workspace-fresh',
        name: 'Fresh',
        accentColor: '#ff00ff',
        paneCount: 1,
      },
    ]);

    renderHook(() => useAppBootstrap());

    await waitFor(() => {
      expect(useUiStore.getState().backendStatus).toBe('ready');
    });

    expect(useUiStore.getState().recoveryStatus?.dirtyShutdown).toBe(true);
    // Snapshot always wins over summary when present (clean or dirty).
    expect(useWorkspaceStore.getState().workspaces[0].id).toBe(
      'workspace-saved',
    );
  });
});
