export type WorkspaceSummary = {
  id: string;
  name: string;
  accentColor: string;
  paneCount: number;
};

export type TemplatePaneSpec = {
  title: string;
  cwd: string;
  shell: string | null;
  startupCommand: string;
};

export type WorkspaceTemplate = {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  layoutPreset: string;
  panes: TemplatePaneSpec[];
};

export type MaterializedWorkspace = {
  id: string;
  name: string;
  accentColor: string;
  layoutPreset: string;
  paneCount: number;
};

export type AppInfo = {
  name: string;
  version: string;
  platform: string;
};

export type DiagnosticsSummary = {
  appDataDir: string;
  logDir: string;
  latestLogFile: string | null;
  recentCrashReports: string[];
};

export type StateSnapshot = {
  activeWorkspaceId: string;
  workspaces: import('@/types/workspace').Workspace[];
  savedAt: string;
};

export type ExportPayload = {
  version: string;
  exportedAt: string;
  activeWorkspaceId: string;
  workspaces: import('@/types/workspace').Workspace[];
};

export type RecoveryStatus = {
  dirtyShutdown: boolean;
  hasSnapshot: boolean;
  lockfilePath: string;
  snapshotPath: string;
  snapshot: StateSnapshot | null;
};

export type SystemHealth = {
  status: string;
  service: string;
  configFileName: string;
  supportedLayoutPresets: string[];
  ptyOutputEvent: string;
  ptyExitEvent: string;
  workspaceChangedEvent: string;
  autosaveTriggeredEvent: string;
};

export type BootstrapStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'fallback'
  | 'error';

export type LogLine = {
  timestamp: string;
  level: string;
  target: string;
  message: string;
};

export type UpdateInfo = {
  available: boolean;
  version: string | null;
  currentVersion: string;
  notes: string | null;
};

export type PerfProbeResult = {
  spawnMs: number;
  shell: string;
  shellSource: string;
  cwd: string;
  resolverProbeMs: number;
  totalMs: number;
  activeSessionsAfter: number;
};

export type MultiSpawnReport = {
  panes: number;
  totalSpawnMs: number;
  avgSpawnMs: number;
  p50SpawnMs: number;
  p95SpawnMs: number;
  minSpawnMs: number;
  maxSpawnMs: number;
  rssBeforeBytes: number | null;
  rssAfterBytes: number | null;
  rssDeltaBytes: number | null;
  targetTotalMs: number;
  withinBudget: boolean;
};

export type IdleReport = {
  panes: number;
  dwellMs: number;
  sampleCount: number;
  rssMinBytes: number;
  rssMaxBytes: number;
  rssDeltaBytes: number;
  rssFirstBytes: number;
  rssLastBytes: number;
  totalMs: number;
  targetMaxRssBytes: number;
  withinBudget: boolean;
};

export type PaneOutputCounters = {
  paneId: string;
  bytes: number;
  batches: number;
};

export type ThroughputReport = {
  panes: number;
  linesPerPane: number;
  totalBytes: number;
  totalBatches: number;
  perPane: PaneOutputCounters[];
  durationMs: number;
  throughputKbps: number;
  targetKbps: number;
  withinBudget: boolean;
  expectedBytes: number;
  bytesRatio: number;
};

export type TtyRespondingProbeReport = {
  panes: number;
  linesPerPane: number;
  totalBytes: number;
  totalBatches: number;
  perPane: PaneOutputCounters[];
  durationMs: number;
  throughputKbps: number;
  cursorQueryReceived: number;
  deviceAttributesReceived: number;
  unhandledQueries: number;
};

export type MetricDirection = 'lower-is-better' | 'higher-is-better';

export type MetricDelta = {
  name: string;
  baseline: number;
  current: number;
  deltaPct: number;
  regressed: boolean;
  direction: MetricDirection;
};

export type BaselineComparison = {
  thresholdPct: number;
  deltas: MetricDelta[];
  regressedCount: number;
  passed: boolean;
};

// ============================================================================
// Keybind backend (TDD 3.6)
// ============================================================================

export type KeybindComboPart = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

export type KeybindOverride = KeybindComboPart & {
  keybindId: string;
  updatedAt: string;
};

export type ConflictHint = {
  combo: KeybindComboPart;
  label: string;
  tools: string[];
  category: 'readline' | 'vim' | 'terminal-flow' | 'shell' | string;
  advice: string;
};

export type SetKeybindOverrideResult = {
  overrideRow: KeybindOverride;
  conflicts: ConflictHint[];
};

export type PassthroughEntry = {
  paneId: string;
  enabledAt: string;
};

// ============================================================================
// Multi-window (PRD §7 / SDD §2.4)
// ============================================================================

export type WindowInfo = {
  label: string;
  title: string;
  workspaceId: string | null;
};
