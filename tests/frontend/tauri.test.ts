import { vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

describe('tauri wrapper functions', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('detects non-Tauri runtime cleanly', async () => {
    const { isTauriRuntime } = await import('@/lib/tauri');

    expect(isTauriRuntime()).toBe(false);
  });

  it('invokes workspace list command', async () => {
    invokeMock.mockResolvedValue([]);
    const { workspaceList } = await import('@/lib/tauri');

    await workspaceList();

    expect(invokeMock).toHaveBeenCalledWith('workspace_list');
  });

  it('invokes config and system commands', async () => {
    invokeMock.mockResolvedValue({});
    const { configGetAppInfo, systemGetDiagnostics, systemHealthCheck } =
      await import('@/lib/tauri');

    await configGetAppInfo();
    await systemHealthCheck();
    await systemGetDiagnostics();

    expect(invokeMock).toHaveBeenCalledWith('config_get_app_info');
    expect(invokeMock).toHaveBeenCalledWith('system_health_check');
    expect(invokeMock).toHaveBeenCalledWith('system_get_diagnostics');
  });

  it('invokes PTY command wrappers with the expected payloads', async () => {
    invokeMock.mockResolvedValue({});
    const {
      ptyAck,
      ptyClose,
      ptyResize,
      ptyRestart,
      ptySpawn,
      ptyWrite,
      ptyWriteBinary,
    } = await import('@/lib/tauri');

    await ptySpawn({
      workspaceId: 'workspace-Nonaterm',
      paneId: 'pane-agent',
      shell: 'cmd.exe',
      cwd: 'D:\\production\\Nonaterm',
      rows: 40,
      cols: 120,
    });
    await ptyClose('pane-agent');
    await ptyWrite('pane-agent', 'dir');
    await ptyWriteBinary('pane-agent', [13, 10]);
    await ptyResize('pane-agent', 30, 100);
    await ptyAck('pane-agent');
    await ptyRestart('pane-agent');

    expect(invokeMock).toHaveBeenCalledWith('pty_spawn', {
      workspaceId: 'workspace-Nonaterm',
      paneId: 'pane-agent',
      shell: 'cmd.exe',
      cwd: 'D:\\production\\Nonaterm',
      rows: 40,
      cols: 120,
    });
    expect(invokeMock).toHaveBeenCalledWith('pty_close', {
      paneId: 'pane-agent',
    });
    expect(invokeMock).toHaveBeenCalledWith('pty_write', {
      paneId: 'pane-agent',
      data: 'dir',
    });
    expect(invokeMock).toHaveBeenCalledWith('pty_write_binary', {
      paneId: 'pane-agent',
      data: [13, 10],
    });
    expect(invokeMock).toHaveBeenCalledWith('pty_resize', {
      paneId: 'pane-agent',
      rows: 30,
      cols: 100,
    });
    expect(invokeMock).toHaveBeenCalledWith('pty_ack', {
      paneId: 'pane-agent',
    });
    expect(invokeMock).toHaveBeenCalledWith('pty_restart', {
      paneId: 'pane-agent',
    });
  });

  it('invokes state persistence command wrappers', async () => {
    invokeMock.mockResolvedValue({});
    const {
      stateGetRecoveryStatus,
      stateInitDb,
      stateMarkCleanShutdown,
      stateSaveSnapshot,
    } = await import('@/lib/tauri');

    const snapshot = {
      activeWorkspaceId: 'workspace-1',
      workspaces: [],
      savedAt: '2026-01-01T00:00:00.000Z',
    };

    await stateInitDb();
    await stateGetRecoveryStatus();
    await stateSaveSnapshot(snapshot);
    await stateMarkCleanShutdown();

    expect(invokeMock).toHaveBeenCalledWith('state_init_db');
    expect(invokeMock).toHaveBeenCalledWith('state_get_recovery_status');
    expect(invokeMock).toHaveBeenCalledWith('state_save_snapshot', {
      snapshot,
    });
    expect(invokeMock).toHaveBeenCalledWith('state_mark_clean_shutdown');
  });

  it('invokes state export/import command wrappers', async () => {
    const exportJson = JSON.stringify({
      version: '0.1.0',
      exportedAt: '2026-06-19T00:00:00.000Z',
      activeWorkspaceId: 'ws-1',
      workspaces: [],
    });
    invokeMock.mockResolvedValue(exportJson);
    const {
      stateExportConfig,
      stateExportToFile,
      stateImportConfig,
      stateImportFromFile,
    } = await import('@/lib/tauri');

    await stateExportConfig();

    invokeMock.mockResolvedValue(2);
    await stateImportConfig('{}');
    await stateExportToFile('/path/export.json');
    await stateImportFromFile('/path/import.json');

    expect(invokeMock).toHaveBeenCalledWith('state_export_config');
    expect(invokeMock).toHaveBeenCalledWith('state_import_config', {
      config: '{}',
    });
    expect(invokeMock).toHaveBeenCalledWith('state_export_to_file', {
      path: '/path/export.json',
    });
    expect(invokeMock).toHaveBeenCalledWith('state_import_from_file', {
      path: '/path/import.json',
    });
  });

  it('invokes update command wrappers', async () => {
    invokeMock.mockResolvedValue({
      available: false,
      version: null,
      currentVersion: '0.1.0',
      notes: null,
    });
    const { systemCheckUpdates, systemInstallUpdate } =
      await import('@/lib/tauri');

    await systemCheckUpdates();
    await systemInstallUpdate();

    expect(invokeMock).toHaveBeenCalledWith('system_check_updates');
    expect(invokeMock).toHaveBeenCalledWith('system_install_update');
  });

  it('invokes perf probe wrapper', async () => {
    invokeMock.mockResolvedValue({ spawnMs: 42, shell: 'powershell.exe', cwd: 'D:\\' });
    const { systemRunPerfProbe } = await import('@/lib/tauri');

    await systemRunPerfProbe();

    expect(invokeMock).toHaveBeenCalledWith('system_run_perf_probe');
  });

  it('invokes multi-spawn probe with default pane count', async () => {
    invokeMock.mockResolvedValue({
      panes: 9,
      totalSpawnMs: 1700,
      withinBudget: true,
    });
    const { systemRunMultiSpawnProbe } = await import('@/lib/tauri');

    await systemRunMultiSpawnProbe();
    await systemRunMultiSpawnProbe(6, 30, 120);

    expect(invokeMock).toHaveBeenCalledWith('system_run_multi_spawn_probe', {
      panes: 9,
      rows: 24,
      cols: 80,
    });
    expect(invokeMock).toHaveBeenCalledWith('system_run_multi_spawn_probe', {
      panes: 6,
      rows: 30,
      cols: 120,
    });
  });

  it('invokes idle probe with defaults and overrides', async () => {
    invokeMock.mockResolvedValue({
      panes: 9,
      dwellMs: 1500,
      rssMaxBytes: 80 * 1024 * 1024,
      withinBudget: true,
    });
    const { systemRunIdleProbe } = await import('@/lib/tauri');

    await systemRunIdleProbe();
    await systemRunIdleProbe(6, 2000, 100);

    expect(invokeMock).toHaveBeenCalledWith('system_run_idle_probe', {
      panes: 9,
      dwellMs: 1500,
      sampleIntervalMs: 200,
    });
    expect(invokeMock).toHaveBeenCalledWith('system_run_idle_probe', {
      panes: 6,
      dwellMs: 2000,
      sampleIntervalMs: 100,
    });
  });

  it('invokes throughput probe with defaults and overrides', async () => {
    invokeMock.mockResolvedValue({
      panes: 9,
      linesPerPane: 100,
      totalBytes: 14400,
      throughputKbps: 200,
      withinBudget: true,
    });
    const { systemRunThroughputProbe } = await import('@/lib/tauri');

    await systemRunThroughputProbe();
    await systemRunThroughputProbe(4, 250, 5000);

    expect(invokeMock).toHaveBeenCalledWith('system_run_throughput_probe', {
      panes: 9,
      linesPerPane: 100,
      measurementWindowMs: 3000,
    });
    expect(invokeMock).toHaveBeenCalledWith('system_run_throughput_probe', {
      panes: 4,
      linesPerPane: 250,
      measurementWindowMs: 5000,
    });
  });

  it('invokes keybind_get_overrides', async () => {
    invokeMock.mockResolvedValue([
      {
        keybindId: 'command_palette',
        key: 'p',
        ctrl: true,
        shift: true,
        alt: false,
        meta: false,
        updatedAt: '2026-06-20T00:00:00Z',
      },
    ]);
    const { keybindGetOverrides } = await import('@/lib/tauri');

    const result = await keybindGetOverrides();

    expect(invokeMock).toHaveBeenCalledWith('keybind_get_overrides');
    expect(result).toHaveLength(1);
    expect(result[0].keybindId).toBe('command_palette');
  });

  it('invokes keybind_set_override with full combo parts', async () => {
    invokeMock.mockResolvedValue({
      overrideRow: {
        keybindId: 'k1',
        key: 'p',
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
        updatedAt: '2026-06-20T00:00:00Z',
      },
      conflicts: [
        {
          combo: { key: 'p', ctrl: true, shift: false, alt: false, meta: false },
          label: 'Ctrl+P',
          tools: ['Previous history (bash/zsh)'],
          category: 'readline',
          advice: 'Ganti ke Ctrl+Alt+P',
        },
      ],
    });
    const { keybindSetOverride } = await import('@/lib/tauri');

    const result = await keybindSetOverride('k1', 'p', true, false, false, false);

    expect(invokeMock).toHaveBeenCalledWith('keybind_set_override', {
      keybindId: 'k1',
      key: 'p',
      ctrl: true,
      shift: false,
      alt: false,
      meta: false,
    });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].category).toBe('readline');
  });

  it('invokes keybind_check_conflict without saving', async () => {
    invokeMock.mockResolvedValue([]);
    const { keybindCheckConflict } = await import('@/lib/tauri');

    await keybindCheckConflict('p', true, true, false, false);

    expect(invokeMock).toHaveBeenCalledWith('keybind_check_conflict', {
      key: 'p',
      ctrl: true,
      shift: true,
      alt: false,
      meta: false,
    });
  });

  it('invokes keybind_clear_override and clear_all_overrides', async () => {
    invokeMock.mockResolvedValue(true);
    const { keybindClearOverride, keybindClearAllOverrides } = await import(
      '@/lib/tauri'
    );

    await keybindClearOverride('k1');
    await keybindClearAllOverrides();

    expect(invokeMock).toHaveBeenCalledWith('keybind_clear_override', {
      keybindId: 'k1',
    });
    expect(invokeMock).toHaveBeenCalledWith('keybind_clear_all_overrides');
  });

  it('invokes pane_get_passthrough_list and pane_set_passthrough', async () => {
    invokeMock.mockResolvedValue([
      { paneId: 'p-1', enabledAt: '2026-06-20T00:00:00Z' },
    ]);
    const { paneGetPassthroughList, paneSetPassthrough } = await import(
      '@/lib/tauri'
    );

    const list = await paneGetPassthroughList();
    await paneSetPassthrough('p-1', true);
    await paneSetPassthrough('p-2', false);

    expect(invokeMock).toHaveBeenCalledWith('pane_get_passthrough_list');
    expect(list).toHaveLength(1);
    expect(invokeMock).toHaveBeenCalledWith('pane_set_passthrough', {
      paneId: 'p-1',
      enabled: true,
    });
    expect(invokeMock).toHaveBeenCalledWith('pane_set_passthrough', {
      paneId: 'p-2',
      enabled: false,
    });
  });

  it('invokes crash simulation with new state-level scenarios', async () => {
    invokeMock.mockResolvedValue({
      consumed: ['snapshot-write-io-error', 'sqlite-busy-timeout', 'recovery-race'],
      summary: {
        spawnAttempts: 0,
        spawnSucceeded: 0,
        spawnFailed: 0,
        readAttempts: 0,
        readBrokenPipe: 0,
        panicsCaught: 0,
        resizeAttempts: 0,
        resizeInvalid: 0,
        snapshotWriteFailures: 1,
        snapshotWriteSuccess: 0,
        sqliteBusyWaitMs: 150,
        sqliteBusyRetries: 1,
        recoveryRacesObserved: 1,
      },
    });
    const { systemRunCrashSimulation } = await import('@/lib/tauri');

    const result = await systemRunCrashSimulation([
      { scenario: 'snapshot-write-io-error', count: 1 },
      { scenario: 'sqlite-busy-timeout', count: 1 },
      { scenario: 'recovery-race', count: 1 },
    ]);

    expect(invokeMock).toHaveBeenCalledWith('system_run_crash_simulation', {
      scenarios: [
        { scenario: 'snapshot-write-io-error', count: 1 },
        { scenario: 'sqlite-busy-timeout', count: 1 },
        { scenario: 'recovery-race', count: 1 },
      ],
    });
    expect(result.consumed).toHaveLength(3);
    expect(result.summary.snapshotWriteFailures).toBe(1);
    expect(result.summary.sqliteBusyWaitMs).toBe(150);
    expect(result.summary.recoveryRacesObserved).toBe(1);
  });

  it('invokes log lines command wrapper with optional filters', async () => {
    invokeMock.mockResolvedValue([]);
    const { systemGetLogLines } = await import('@/lib/tauri');

    await systemGetLogLines();
    await systemGetLogLines(100, 'ERROR');

    expect(invokeMock).toHaveBeenCalledWith('system_get_log_lines', {
      lines: undefined,
      level: undefined,
    });
    expect(invokeMock).toHaveBeenCalledWith('system_get_log_lines', {
      lines: 100,
      level: 'ERROR',
    });
  });

  it('invokes workspace_open_in_new_window with the workspace id', async () => {
    invokeMock.mockResolvedValue('Nonaterm-ws-ws-Nonaterm-abcd1234');
    const { workspaceOpenInNewWindow } = await import('@/lib/tauri');

    const label = await workspaceOpenInNewWindow('workspace-Nonaterm');

    expect(invokeMock).toHaveBeenCalledWith('workspace_open_in_new_window', {
      workspaceId: 'workspace-Nonaterm',
    });
    expect(label).toBe('Nonaterm-ws-ws-Nonaterm-abcd1234');
  });

  it('invokes workspace_list_windows and returns the array', async () => {
    invokeMock.mockResolvedValue([
      { label: 'main', title: 'Nonaterm', workspaceId: null },
      {
        label: 'Nonaterm-ws-workspace-1-abcd1234',
        title: 'Nonaterm — workspace-1',
        workspaceId: 'workspace-1',
      },
    ]);
    const { workspaceListWindows } = await import('@/lib/tauri');

    const windows = await workspaceListWindows();

    expect(invokeMock).toHaveBeenCalledWith('workspace_list_windows');
    expect(windows).toHaveLength(2);
    expect(windows[1].workspaceId).toBe('workspace-1');
  });

  it('invokes workspace_close_window with the label', async () => {
    invokeMock.mockResolvedValue(undefined);
    const { workspaceCloseWindow } = await import('@/lib/tauri');

    await workspaceCloseWindow('Nonaterm-ws-workspace-1-abcd1234');

    expect(invokeMock).toHaveBeenCalledWith('workspace_close_window', {
      label: 'Nonaterm-ws-workspace-1-abcd1234',
    });
  });

  it('invokes templates_export with workspace id, name, and path', async () => {
    invokeMock.mockResolvedValue(undefined);
    const { templatesExport } = await import('@/lib/tauri');

    await templatesExport(
      'workspace-alpha',
      'My Template',
      'D:\\templates\\my-template.json',
    );

    expect(invokeMock).toHaveBeenCalledWith('templates_export', {
      workspaceId: 'workspace-alpha',
      name: 'My Template',
      path: 'D:\\templates\\my-template.json',
    });
  });

  it('invokes templates_import and returns parsed WorkspaceTemplate', async () => {
    const importedTemplate = {
      id: 'frontend-dev',
      label: 'Frontend dev',
      description: 'Dev server + tests',
      accentColor: '#0ea5e9',
      layoutPreset: '2',
      panes: [
        { title: 'Vite', cwd: '', shell: null, startupCommand: 'npm run dev' },
        { title: 'Tests', cwd: '', shell: null, startupCommand: '' },
      ],
    };
    invokeMock.mockResolvedValue(importedTemplate);
    const { templatesImport } = await import('@/lib/tauri');

    const result = await templatesImport('D:\\templates\\frontend.json');

    expect(invokeMock).toHaveBeenCalledWith('templates_import', {
      path: 'D:\\templates\\frontend.json',
    });
    expect(result.label).toBe('Frontend dev');
    expect(result.panes).toHaveLength(2);
    expect(result.panes[0].startupCommand).toBe('npm run dev');
  });
});
