import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  AppInfo,
  ConflictHint,
  DiagnosticsSummary,
  ExportPayload,
  IdleReport,
  KeybindOverride,
  LogLine,
  MaterializedWorkspace,
  MultiSpawnReport,
  PassthroughEntry,
  PerfProbeResult,
  RecoveryStatus,
  SetKeybindOverrideResult,
  StateSnapshot,
  SystemHealth,
  ThroughputReport,
  TtyRespondingProbeReport,
  UpdateInfo,
  WindowInfo,
  WorkspaceSummary,
  WorkspaceTemplate,
} from '@/types/ipc';
import type { PtySessionInfo, PtySpawnRequest } from '@/types/terminal';

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type Platform = 'windows' | 'macos' | 'linux';

let cachedPlatform: Platform | null = null;

export function detectPlatform(): Platform {
  if (cachedPlatform) return cachedPlatform;
  // Try Tauri API first (more reliable)
  if (isTauriRuntime()) {
    // Will be resolved async, fallback to UA for sync
    systemGetPlatform().then((p) => {
      if (p === 'macos' || p === 'darwin') cachedPlatform = 'macos';
      else if (p === 'linux') cachedPlatform = 'linux';
      else cachedPlatform = 'windows';
    }).catch(() => {});
  }
  // Fallback to user agent
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac') || ua.includes('darwin')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'windows';
}

export function isMac(): boolean {
  return detectPlatform() === 'macos';
}

export function isLinux(): boolean {
  return detectPlatform() === 'linux';
}

export function isWindows(): boolean {
  return detectPlatform() === 'windows';
}

/** Get the modifier key label for the current platform. */
export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/** Get the platform-specific shell list. */
export function platformShells(): Array<{ id: string; name: string; command: string }> {
  if (isMac()) {
    return [
      { id: 'zsh', name: 'Zsh', command: '/bin/zsh' },
      { id: 'bash', name: 'Bash', command: '/bin/bash' },
      { id: 'fish', name: 'Fish', command: '/usr/local/bin/fish' },
      { id: 'default', name: 'Default', command: '' },
      { id: 'custom', name: 'Custom', command: '' },
    ];
  }
  if (isLinux()) {
    return [
      { id: 'bash', name: 'Bash', command: '/bin/bash' },
      { id: 'zsh', name: 'Zsh', command: '/bin/zsh' },
      { id: 'fish', name: 'Fish', command: '/usr/bin/fish' },
      { id: 'default', name: 'Default', command: '' },
      { id: 'custom', name: 'Custom', command: '' },
    ];
  }
  // Windows
  return [
    { id: 'powershell', name: 'PowerShell', command: 'powershell.exe' },
    { id: 'pwsh', name: 'PowerShell 7', command: 'pwsh.exe' },
    { id: 'cmd', name: 'CMD', command: 'cmd.exe' },
    { id: 'gitbash', name: 'Git Bash', command: 'C:\\Program Files\\Git\\bin\\bash.exe' },
    { id: 'wsl', name: 'WSL', command: 'wsl.exe' },
    { id: 'default', name: 'Default', command: '' },
    { id: 'custom', name: 'Custom', command: '' },
  ];
}

export function workspaceList() {
  return invoke<WorkspaceSummary[]>('workspace_list');
}

export function workspaceOpenInNewWindow(workspaceId: string) {
  return invoke<string>('workspace_open_in_new_window', { workspaceId });
}

export function workspaceListWindows() {
  return invoke<WindowInfo[]>('workspace_list_windows');
}

export function workspaceCloseWindow(label: string) {
  return invoke<void>('workspace_close_window', { label });
}

export type WindowOpenedPayload = {
  workspaceId: string;
  windowLabel: string;
};

export type WindowClosedPayload = {
  workspaceId: string;
  windowLabel: string;
};

export function onWindowOpened(
  handler: (payload: WindowOpenedPayload) => void,
): Promise<UnlistenFn> {
  return listen<WindowOpenedPayload>('workspace:window-opened', (event) => {
    handler(event.payload);
  });
}

export function onWindowClosed(
  handler: (payload: WindowClosedPayload) => void,
): Promise<UnlistenFn> {
  return listen<WindowClosedPayload>('workspace:window-closed', (event) => {
    handler(event.payload);
  });
}

export function configGetAppInfo() {
  return invoke<AppInfo>('config_get_app_info');
}

export function systemHealthCheck() {
  return invoke<SystemHealth>('system_health_check');
}

export function systemGetDiagnostics() {
  return invoke<DiagnosticsSummary>('system_get_diagnostics');
}

export function ptySpawn(payload: PtySpawnRequest) {
  return invoke<PtySessionInfo>('pty_spawn', payload);
}

export function ptyClose(paneId: string) {
  return invoke<void>('pty_close', { paneId });
}

export function ptyWrite(paneId: string, data: string) {
  return invoke<void>('pty_write', { paneId, data });
}

export function ptyWriteBinary(paneId: string, data: number[]) {
  return invoke<void>('pty_write_binary', { paneId, data });
}

export function ptyResize(paneId: string, rows: number, cols: number) {
  return invoke<void>('pty_resize', { paneId, rows, cols });
}

export function ptyAck(paneId: string) {
  return invoke<void>('pty_ack', { paneId });
}

export function ptyRestart(paneId: string) {
  return invoke<PtySessionInfo>('pty_restart', { paneId });
}

export function stateGetRecoveryStatus() {
  return invoke<RecoveryStatus>('state_get_recovery_status');
}

export function stateSaveSnapshot(snapshot: StateSnapshot) {
  return invoke<void>('state_save_snapshot', { snapshot });
}

export function stateMarkCleanShutdown() {
  return invoke<void>('state_mark_clean_shutdown');
}

export function stateInitDb() {
  return invoke<void>('state_init_db');
}

export async function stateExportConfig(): Promise<ExportPayload> {
  const json = await invoke<string>('state_export_config');
  return JSON.parse(json) as ExportPayload;
}

export function stateImportConfig(config: string) {
  return invoke<number>('state_import_config', { config });
}

export function stateExportToFile(path: string) {
  return invoke<void>('state_export_to_file', { path });
}

export function stateImportFromFile(path: string) {
  return invoke<number>('state_import_from_file', { path });
}

export function systemGetLogLines(lines?: number, level?: string) {
  return invoke<LogLine[]>('system_get_log_lines', { lines, level });
}

export function systemCheckUpdates() {
  return invoke<UpdateInfo>('system_check_updates');
}

export function systemInstallUpdate() {
  return invoke<void>('system_install_update');
}

export function systemRunPerfProbe() {
  return invoke<PerfProbeResult>('system_run_perf_probe');
}

export function systemRunMultiSpawnProbe(
  panes = 9,
  rows = 24,
  cols = 80,
) {
  return invoke<MultiSpawnReport>('system_run_multi_spawn_probe', {
    panes,
    rows,
    cols,
  });
}

export function systemRunIdleProbe(
  panes = 9,
  dwellMs = 1500,
  sampleIntervalMs = 200,
) {
  return invoke<IdleReport>('system_run_idle_probe', {
    panes,
    dwellMs,
    sampleIntervalMs,
  });
}

export function systemRunThroughputProbe(
  panes = 9,
  linesPerPane = 100,
  measurementWindowMs = 3000,
) {
  return invoke<ThroughputReport>('system_run_throughput_probe', {
    panes,
    linesPerPane,
    measurementWindowMs,
  });
}

export function systemRunTtyRespondingProbe(
  panes = 9,
  linesPerPane = 100,
  measurementWindowMs = 3000,
) {
  return invoke<TtyRespondingProbeReport>('system_run_tty_responding_probe', {
    panes,
    linesPerPane,
    measurementWindowMs,
  });
}

export type { BaselineComparison, IdleReport, ThroughputReport } from '@/types/ipc';

export type CrashScenarioInput = { scenario: string; count: number };
export type CrashSimulationResult = {
  consumed: string[];
  summary: {
    spawnAttempts: number;
    spawnSucceeded: number;
    spawnFailed: number;
    readAttempts: number;
    readBrokenPipe: number;
    panicsCaught: number;
    resizeAttempts: number;
    resizeInvalid: number;
    snapshotWriteFailures: number;
    snapshotWriteSuccess: number;
    sqliteBusyWaitMs: number;
    sqliteBusyRetries: number;
    recoveryRacesObserved: number;
  };
};

export function systemRunCrashSimulation(scenarios: CrashScenarioInput[]) {
  return invoke<CrashSimulationResult>('system_run_crash_simulation', {
    scenarios,
  });
}

export function templatesList() {
  return invoke<WorkspaceTemplate[]>('templates_list');
}

export function templatesMaterialize(id: string, name?: string) {
  return invoke<MaterializedWorkspace>('templates_materialize', { id, name });
}

export function templatesExport(workspaceId: string, name: string, path: string) {
  return invoke<void>('templates_export', { workspaceId, name, path });
}

export function templatesImport(path: string) {
  return invoke<WorkspaceTemplate>('templates_import', { path });
}

// ============================================================================
// Keybind backend (TDD 3.6)
// ============================================================================

export function keybindGetOverrides() {
  return invoke<KeybindOverride[]>('keybind_get_overrides');
}

export function keybindSetOverride(
  keybindId: string,
  key: string,
  ctrl = false,
  shift = false,
  alt = false,
  meta = false,
) {
  return invoke<SetKeybindOverrideResult>('keybind_set_override', {
    keybindId,
    key,
    ctrl,
    shift,
    alt,
    meta,
  });
}

export function keybindClearOverride(keybindId: string) {
  return invoke<boolean>('keybind_clear_override', { keybindId });
}

export function keybindClearAllOverrides() {
  return invoke<number>('keybind_clear_all_overrides');
}

export function keybindCheckConflict(
  key: string,
  ctrl = false,
  shift = false,
  alt = false,
  meta = false,
) {
  return invoke<ConflictHint[]>('keybind_check_conflict', {
    key,
    ctrl,
    shift,
    alt,
    meta,
  });
}

export function paneGetPassthroughList() {
  return invoke<PassthroughEntry[]>('pane_get_passthrough_list');
}

export function paneSetPassthrough(paneId: string, enabled: boolean) {
  return invoke<void>('pane_set_passthrough', { paneId, enabled });
}

export type GitRepoInfo = {
  root: string;
  currentBranch: string | null;
  headSha: string | null;
  isWorktree: boolean;
  worktrees: Array<{
    path: string;
    branch: string | null;
    headSha: string | null;
    isMain: boolean;
  }>;
};

export type CreateWorktreeRequest = {
  repo: string;
  branch: string;
  createBranch: boolean;
  base: string | null;
};

export type CreateWorktreeResult = {
  worktreePath: string;
  branch: string;
};

export function gitDetectRepo(folder: string) {
  return invoke<GitRepoInfo | null>('git_detect_repo', { folder });
}

export function gitListBranches(repo: string) {
  return invoke<string[]>('git_list_branches', { repo });
}

export function gitListWorktrees(repo: string) {
  return invoke<GitRepoInfo['worktrees']>('git_list_worktrees', { repo });
}

export function gitCreateWorktree(req: CreateWorktreeRequest) {
  return invoke<CreateWorktreeResult>('git_create_worktree', { req });
}

export async function pickFolder() {
  if (!isTauriRuntime()) {
    return null;
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({
    directory: true,
    multiple: false,
    title: 'Select terminal working directory',
  });

  return typeof result === 'string' ? result : null;
}

export async function pickTemplateFile() {
  if (!isTauriRuntime()) {
    return null;
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({
    directory: false,
    multiple: false,
    title: 'Select workspace template file',
    filters: [{ name: 'Workspace template', extensions: ['json'] }],
  });

  return typeof result === 'string' ? result : null;
}

export function systemReadTextFile(path: string) {
  return invoke<string | null>('system_read_text_file', { path });
}

export function systemDetectProjectRules(dir: string) {
  return invoke<string | null>('system_detect_project_rules', { dir });
}

export function windowSavePosition(windowLabel: string) {
  return invoke<void>('window_save_position', { windowLabel });
}

export function windowRestorePosition(windowLabel: string) {
  return invoke<boolean>('window_restore_position', { windowLabel });
}

export function systemRegisterGlobalHotkey(shortcut: string) {
  return invoke<void>('system_register_global_hotkey', { shortcut });
}

export function systemUnregisterGlobalHotkey(shortcut: string) {
  return invoke<void>('system_unregister_global_hotkey', { shortcut });
}

export function systemStartFileWatcher(workspaceId: string, path: string) {
  return invoke<void>('system_start_file_watcher', { workspaceId, path });
}

export function systemValidateState() {
  return invoke<string>('system_validate_state');
}

export function systemCliStatus() {
  return invoke<Record<string, unknown>>('system_cli_status');
}

export function systemCliSend(paneId: string, text: string) {
  return invoke<void>('system_cli_send', { paneId, text });
}

export function systemCliListPanes() {
  return invoke<Array<Record<string, unknown>>>('system_cli_list_panes');
}

export function systemGetPlatform() {
  return invoke<string>('system_get_platform');
}

export function systemGetDefaultShell() {
  return invoke<string>('system_get_default_shell');
}
