import type { Page } from '@playwright/test';
import type {
  DiagnosticsSummary,
  LogLine,
  RecoveryStatus,
  SystemHealth,
  WorkspaceSummary,
} from '@/types/ipc';
import type { Workspace } from '@/types/workspace';

export type MockResponseMap = Record<string, unknown>;

function isFunction(value: unknown): value is () => unknown {
  return typeof value === 'function';
}

function defaultHealthCheck(): SystemHealth {
  return {
    status: 'ok',
    service: 'Nonaterm-backend',
    configFileName: 'config.json',
    supportedLayoutPresets: ['1', '2', '4', '6', '9'],
    ptyOutputEvent: 'pty:output',
    ptyExitEvent: 'pty:exit',
    workspaceChangedEvent: 'workspace:changed',
    autosaveTriggeredEvent: 'autosave:triggered',
  };
}

function defaultAppInfo() {
  return {
    name: 'Nonaterm',
    version: '0.1.0',
    platform: 'windows',
  };
}

function defaultDiagnostics(): DiagnosticsSummary {
  return {
    appDataDir: 'C:\\Users\\test\\AppData\\Roaming\\Nonaterm',
    logDir: 'C:\\Users\\test\\AppData\\Roaming\\Nonaterm\\logs',
    latestLogFile:
      'C:\\Users\\test\\AppData\\Roaming\\Nonaterm\\logs\\Nonaterm.log',
    recentCrashReports: [],
  };
}

function defaultRecoveryStatus(): RecoveryStatus {
  return {
    dirtyShutdown: false,
    hasSnapshot: true,
    lockfilePath: 'state/Nonaterm.lock',
    snapshotPath: 'state/workspace-snapshot.json',
    snapshot: {
      activeWorkspaceId: 'workspace-Nonaterm',
      workspaces: [
        {
          id: 'workspace-Nonaterm',
          name: 'Nonaterm Core',
          accentColor: '#7c3aed',
          layoutPreset: '2',
          panes: [
            {
              id: 'pane-agent',
              title: 'Agent',
              cwd: '',
              startupCommand: 'claude',
            },
            {
              id: 'pane-dev',
              title: 'Dev UI',
              cwd: '',
              startupCommand: 'npm run dev',
            },
          ],
        },
        {
          id: 'workspace-playground',
          name: 'Playground',
          accentColor: '#0ea5e9',
          layoutPreset: '2',
          panes: [
            {
              id: 'pane-a',
              title: 'Scratch A',
              cwd: '',
              startupCommand: '',
            },
            {
              id: 'pane-b',
              title: 'Scratch B',
              cwd: '',
              startupCommand: '',
            },
          ],
        },
      ],
      savedAt: '2026-06-19T00:00:00.000Z',
    },
  };
}

export function defaultWorkspaceSummaries(): WorkspaceSummary[] {
  return [
    {
      id: 'workspace-Nonaterm',
      name: 'Nonaterm Core',
      accentColor: '#7c3aed',
      paneCount: 2,
    },
    {
      id: 'workspace-playground',
      name: 'Playground',
      accentColor: '#0ea5e9',
      paneCount: 2,
    },
  ];
}

export function defaultMockResponses(
  overrides: Partial<MockResponseMap> = {},
): MockResponseMap {
  return {
    state_init_db: null,
    system_health_check: defaultHealthCheck(),
    config_get_app_info: defaultAppInfo(),
    workspace_list: defaultWorkspaceSummaries(),
    system_get_diagnostics: defaultDiagnostics(),
    state_get_recovery_status: defaultRecoveryStatus(),
    state_save_snapshot: null,
    state_mark_clean_shutdown: null,
    pty_spawn: {
      sessionId: 'session-1',
      workspaceId: 'workspace-Nonaterm',
      paneId: 'pane-agent',
      shell: 'cmd.exe',
      cwd: '',
      rows: 24,
      cols: 80,
      processId: 1234,
    },
    pty_close: null,
    pty_write: null,
    pty_resize: null,
    pty_ack: null,
    pty_restart: {
      sessionId: 'session-2',
      workspaceId: 'workspace-Nonaterm',
      paneId: 'pane-agent',
      shell: 'cmd.exe',
      cwd: '',
      rows: 24,
      cols: 80,
      processId: 5678,
    },
    'plugin:event|listen': 1,
    'plugin:event|unlisten': null,
    system_get_log_lines: [] as LogLine[],
    state_export_config: JSON.stringify({
      version: '0.1.0',
      exportedAt: '2026-06-19T00:00:00.000Z',
      activeWorkspaceId: 'workspace-Nonaterm',
      workspaces: [
        {
          id: 'workspace-Nonaterm',
          name: 'Nonaterm Core',
          accentColor: '#7c3aed',
          layoutPreset: '4',
          panes: [
            {
              id: 'pane-agent',
              title: 'Agent',
              cwd: '',
              startupCommand: 'claude',
            },
            {
              id: 'pane-dev',
              title: 'Dev UI',
              cwd: '',
              startupCommand: 'npm run dev',
            },
          ],
        },
        {
          id: 'workspace-playground',
          name: 'Playground',
          accentColor: '#0ea5e9',
          layoutPreset: '2',
          panes: [
            {
              id: 'pane-a',
              title: 'Scratch A',
              cwd: '',
              startupCommand: '',
            },
            {
              id: 'pane-b',
              title: 'Scratch B',
              cwd: '',
              startupCommand: '',
            },
          ],
        },
      ],
    }),
    state_import_config: 2,
    // Templates (must match WorkspaceTemplate type: panes[] not paneCount)
    templates_list: [
      { id: 'blank', label: 'Blank', description: 'Start from scratch', accentColor: '#6b7280', layoutPreset: '1', panes: [{ title: 'Terminal', cwd: '', shell: null, startupCommand: '' }] },
      { id: 'frontend', label: 'Frontend dev', description: 'Vite + Tests', accentColor: '#3b82f6', layoutPreset: '2', panes: [{ title: 'Dev', cwd: '', shell: null, startupCommand: 'npm run dev' }, { title: 'Tests', cwd: '', shell: null, startupCommand: 'npm run test' }] },
      { id: 'fullstack', label: 'Full-stack', description: 'FE + BE + Logs', accentColor: '#8b5cf6', layoutPreset: '4', panes: [{ title: 'Frontend', cwd: '', shell: null, startupCommand: 'npm run dev' }, { title: 'Backend', cwd: '', shell: null, startupCommand: 'cargo run' }, { title: 'Logs', cwd: '', shell: null, startupCommand: '' }] },
    ] as unknown[],
    templates_materialize: {
      id: 'ws-tpl-1',
      name: 'From Template',
      accentColor: '#3b82f6',
      layoutPreset: '2',
      paneCount: 2,
    },
    templates_export: null,
    templates_import: null,
    // Keybind backend
    keybind_get_overrides: [] as unknown[],
    keybind_set_override: { overrideRow: { keybindId: 'test', key: 'x', ctrl: false, shift: false, alt: false, meta: false }, conflicts: [] },
    keybind_clear_override: null,
    keybind_clear_all_overrides: null,
    keybind_check_conflict: [] as unknown[],
    pane_get_passthrough_list: [] as unknown[],
    pane_set_passthrough: null,
    // Multi-window
    workspace_open_in_new_window: null,
    workspace_list_windows: [] as unknown[],
    workspace_close_window: null,
    // Git
    git_detect_repo: { isRepo: true, rootPath: 'C:\\repo', defaultBranch: 'main' },
    git_list_worktrees: [] as unknown[],
    git_create_worktree: { path: 'C:\\repo\\.worktrees\\new', branch: 'new-branch' },
    ...overrides,
  };
}

export function dirtyRecoveryStatus(
  snapshotWorkspaces: Workspace[] = [],
  activeId = 'workspace-saved',
): RecoveryStatus {
  return {
    dirtyShutdown: true,
    hasSnapshot: true,
    lockfilePath: 'state/Nonaterm.lock',
    snapshotPath: 'state/workspace-snapshot.json',
    snapshot: {
      activeWorkspaceId: activeId,
      workspaces: snapshotWorkspaces,
      savedAt: '2026-06-18T10:00:00.000Z',
    },
  };
}

export function sampleLogLines(): LogLine[] {
  return [
    {
      timestamp: '2026-06-19T10:00:00.000Z',
      level: 'INFO',
      target: 'Nonaterm::app',
      message: 'Application started',
    },
    {
      timestamp: '2026-06-19T10:01:00.000Z',
      level: 'WARN',
      target: 'Nonaterm::pty',
      message: 'PTY buffer near limit',
    },
    {
      timestamp: '2026-06-19T10:02:00.000Z',
      level: 'ERROR',
      target: 'Nonaterm::state',
      message: 'Failed to save snapshot',
    },
  ];
}

export async function mockTauriRuntime(
  page: Page,
  responses: MockResponseMap,
): Promise<void> {
  // Functions can't be serialized via JSON for `addInitScript`. We
  // separate them out, ship only the data fields to the page, and
  // re-bind the functions on the browser side after init.
  const entries = Object.entries(responses);
  const fnKeys: string[] = [];
  const serializable: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (isFunction(value)) {
      fnKeys.push(key);
    } else {
      serializable[key] = value;
    }
  }
  const fnBodies = fnKeys
    .map((key, index) => {
      const fn = responses[key] as () => unknown;
      return `__mockFns[${index}] = ${fn.toString()};`;
    })
    .join('\n');
  const fnKeyList = JSON.stringify(fnKeys);
  const responsesJson = JSON.stringify(serializable);
  await page.addInitScript(`
    var __mockResponses = ${responsesJson};
    var __mockFnKeys = ${fnKeyList};
    var __mockFns = [];
    ${fnBodies}
    var __mockFnMap = {};
    for (var i = 0; i < __mockFnKeys.length; i++) {
      __mockFnMap[__mockFnKeys[i]] = __mockFns[i];
    }
    var __callbackCounter = 0;
    window.__TAURI_INTERNALS__ = {
      invoke: async function(cmd) {
        var fn = __mockFnMap[cmd];
        if (fn) {
          return await fn();
        }
        var response = __mockResponses[cmd];
        return response === undefined ? null : response;
      },
      transformCallback: function(callback, once) {
        __callbackCounter += 1;
        return __callbackCounter;
      },
      unregisterCallback: function(id) {},
      convertFileSrc: function(filePath) {
        return 'asset://localhost/' + encodeURIComponent(filePath);
      }
    };
  `);
}

export function mockWorkspaceList(
  workspaces: WorkspaceSummary[],
): Partial<MockResponseMap> {
  return { workspace_list: workspaces };
}

export function mockRecoveryStatus(
  status: RecoveryStatus,
): Partial<MockResponseMap> {
  return { state_get_recovery_status: status };
}

export function mockLogLines(
  lines: LogLine[],
): Partial<MockResponseMap> {
  return { system_get_log_lines: lines };
}
