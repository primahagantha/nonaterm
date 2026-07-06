import { useEffect, useState, type CSSProperties } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFocusStore } from '@/stores/focusStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { systemDetectProjectRules, isTauriRuntime } from '@/lib/tauri';
import { TerminalGrid } from '@/components/terminal/TerminalGrid';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { RecoveryBanner } from '@/components/shell/RecoveryBanner';
import { BroadcastPanel } from '@/components/shell/BroadcastPanel';
import { TokenMeter } from '@/components/shell/TokenMeter';
import { ErrorBanner } from '@/components/shell/ErrorBanner';
import { UpdateChecker } from '@/components/shell/UpdateChecker';
import { OptionsMenu } from '@/components/shell/OptionsMenu';
import { SettingsPage } from '@/components/shell/SettingsPage';
import { ShortcutsModal } from '@/components/shell/ShortcutsModal';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { LogViewer } from '@/components/shell/LogViewer';
import { TerminalLauncher } from '@/components/shell/TerminalLauncher';
import { UndoCloseToast } from '@/components/shell/UndoCloseToast';
import { ActivePaneTracker } from '@/components/shell/ActivePaneTracker';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';
import { FastLaunchModal } from '@/components/modals/FastLaunchModal';
import { TerminalConfigModal } from '@/components/modals/TerminalConfigModal';
import { CustomThemeInjector } from '@/components/shell/CustomThemeInjector';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { useKeybind } from '@/hooks/useKeybind';
import { getKeybindRegistry, registerAppShortcuts } from '@/lib/keybindBootstrap';
import { THEMES } from '@/stores/settingsStore';

function StatusDot({ status }: { status: string }) {
  const cls = `workspace-header__dot workspace-header__dot--${status}`;
  return <span className={cls} aria-hidden="true" />;
}

function FirstLaunchTooltip() {
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem('nonaterm:tooltip-dismissed');
  });

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 15000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem('nonaterm:tooltip-dismissed', '1');
    setVisible(false);
  };

  return (
    <div className="first-launch-tooltip" role="status">
      <p>
        Welcome! Press <span className="kbd-hint">Ctrl+N</span> to create a workspace,
        or click <strong>+ New Workspace</strong> in the sidebar.
      </p>
      <button type="button" className="btn btn--sm btn--ghost" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}

function WorkspaceHealthStrip({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === workspaceId),
  );
  const sessions = useTerminalStore((s) => s.sessions);

  if (!workspace) return null;

  let running = 0;
  let error = 0;
  let idle = 0;
  for (const pane of workspace.panes) {
    const status = sessions[pane.id]?.status;
    if (status === 'running' || status === 'spawning') running++;
    else if (status === 'error' || status === 'exited') error++;
    else idle++;
  }

  return (
    <div className="workspace-health" aria-label="Workspace health">
      {running > 0 ? (
        <span className="workspace-health__item workspace-health__item--running">
          {running} running
        </span>
      ) : null}
      {idle > 0 ? (
        <span className="workspace-health__item workspace-health__item--idle">
          {idle} idle
        </span>
      ) : null}
      {error > 0 ? (
        <span className="workspace-health__item workspace-health__item--error">
          {error} error
        </span>
      ) : null}
    </div>
  );
}

function ProjectRulesBanner({ cwd }: { cwd?: string }) {
  const [rules, setRules] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!cwd || !isTauriRuntime()) return;
    systemDetectProjectRules(cwd)
      .then((content) => setRules(content))
      .catch(() => {});
  }, [cwd]);

  if (!rules) return null;

  const preview = rules.split('\n').slice(0, 3).join(' ').slice(0, 120);

  return (
    <div className="project-rules" role="status">
      <button
        type="button"
        className="project-rules__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="project-rules__icon" aria-hidden="true">📋</span>
        <span>Project rules detected</span>
        <span className="project-rules__preview">{preview}…</span>
      </button>
      {expanded ? (
        <pre className="project-rules__content">{rules}</pre>
      ) : null}
    </div>
  );
}

function NoWorkspaceEmptyState() {
  const openCreateModal = useUiStore((state) => state.openCreateWorkspaceModal);
  const handleCreate = () => {
    openCreateModal();
  };
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        N
      </div>
      <h2 className="empty-state__title">No workspaces yet</h2>
      <p className="empty-state__desc">
        Pick a folder and Nonaterm will create a workspace that pins that
        working directory. Each workspace can hold up to 9 terminal panes
        with independent shell, startup command, and split layout.
      </p>
      <p className="empty-state__hint">
        Tip: press <span className="kbd-hint">Ctrl+N</span> to create a
        new workspace quickly.
      </p>
      <div className="empty-state__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCreate}
        >
          + Create blank workspace
        </button>
      </div>
    </div>
  );
}

/** App shell utama untuk workspace dan grid terminal. */
export function AppShell() {
  useAppBootstrap();

  const registry = getKeybindRegistry();
  useKeybind(registry);

  const appInfo = useUiStore((state) => state.appInfo);
  const diagnostics = useUiStore((state) => state.diagnostics);
  const backendStatus = useUiStore((state) => state.backendStatus);
  const bootstrapError = useUiStore((state) => state.bootstrapError);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const setActiveWorkspace = useWorkspaceStore(
    (state) => state.setActiveWorkspace,
  );
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find(
      (workspace) => workspace.id === state.activeWorkspaceId,
    ),
  );
  const setShortcutsOpen = useSettingsStore((state) => state.setShortcutsOpen);
  const setOptionsOpen = useSettingsStore((state) => state.setOptionsOpen);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const settingsOpen = useSettingsStore((state) => state.optionsOpen);
  const themeId = useSettingsStore((state) => state.themeId);
  const viewMode = useUiStore((state) => state.viewMode);
  const togglePassthrough = useSettingsStore(
    (state) => state.togglePassthrough,
  );
  const renameWorkspace = useWorkspaceStore((state) => state.renameWorkspace);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // Listen for diagnostics toggle from Settings
  useEffect(() => {
    const handler = () => setShowDiagnostics((v) => !v);
    window.addEventListener('Nonaterm:toggle-diagnostics', handler);
    return () => window.removeEventListener('Nonaterm:toggle-diagnostics', handler);
  }, []);

  // When window dibuka via workspace_open_in_new_window, backend
  // menyuntik `window.location.hash = '#workspace=<id>'` lewat
  // initialization_script. Baca hash di mount dan set active
  // workspace sehingga window baru langsung render workspace yang
  // dimaksud.
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#workspace=([^&]+)/);
    if (!match) {
      return;
    }
    const requestedId = decodeURIComponent(match[1]);
    const { workspaces } = useWorkspaceStore.getState();
    if (workspaces.some((workspace) => workspace.id === requestedId)) {
      useWorkspaceStore.getState().setActiveWorkspace(requestedId);
    }
  }, []);

  const openCreateModal = useUiStore((state) => state.openCreateWorkspaceModal);
  const openFastLaunch = useUiStore((state) => state.openFastLaunchModal);
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);

  useEffect(() => {
    const dispose = registerAppShortcuts({
      setShortcutsOpen: (open) => setShortcutsOpen(open),
      setOptionsOpen: (open) => setOptionsOpen(open),
      openCreateWorkspaceModal: () => openCreateModal(),
      openFastLaunchModal: () => openFastLaunch(),
      closeTopModal: () => {
        setShortcutsOpen(false);
        setOptionsOpen(false);
        setCommandPaletteOpen(false);
      },
      toggleCommandPalette: () => {
        const current = useUiStore.getState().commandPaletteOpen;
        setCommandPaletteOpen(!current);
      },
      togglePassthroughForActivePane: () => {
        const activePaneId = useFocusStore.getState().activePaneId;
        if (activePaneId) {
          togglePassthrough(activePaneId);
        }
      },
    });
    return dispose;
  }, [openCreateModal, openFastLaunch, setOptionsOpen, setShortcutsOpen, setCommandPaletteOpen, togglePassthrough]);

  // Workspace Alt+1..9 — register dynamically against the registry so
  // the conflict detector stays accurate.
  useEffect(() => {
    const disposers: Array<() => void> = [];
    workspaces.slice(0, 9).forEach((workspace, index) => {
      const unregister = registry.register(
        `app.workspace.${index + 1}`,
        { key: String(index + 1), alt: true },
        'app',
        `Switch to workspace #${index + 1}`,
        () => setActiveWorkspace(workspace.id),
      );
      disposers.push(unregister);
    });
    return () => {
      for (const dispose of disposers) {
        dispose();
      }
    };
  }, [registry, workspaces, setActiveWorkspace]);

  const themeLabel = THEMES[themeId]?.label ?? 'Theme';
  const headerWorkspaceName = activeWorkspace?.name ?? 'No workspace selected';
  const headerWorkspaceAccent =
    activeWorkspace?.accentColor ?? 'var(--tw-accent)';
  const appVersion = appInfo?.version ? `v${appInfo.version}` : '';

  return (
    <div
      className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}
    >
      <WorkspaceSidebar />
      <FirstLaunchTooltip />
      <main className="app-main">
        {!settingsOpen && <header className="workspace-header">
          <div className="workspace-header__brand">
            <span
              className="workspace-header__brand-mark"
              aria-hidden="true"
              title="Nonaterm"
            >
              N
            </span>
            <span className="workspace-header__brand-name">Nonaterm</span>
            {appVersion ? (
              <span className="workspace-header__brand-version">{appVersion}</span>
            ) : null}
            <span className="workspace-header__divider" aria-hidden="true" />
            <div className="workspace-header__info">
              <p className="workspace-header__eyebrow">
                <StatusDot status={backendStatus} />
                <span>{themeLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{backendStatus}</span>
              </p>
              {editingName ? (
                <input
                  className="workspace-header__name-input"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={() => {
                    const trimmed = editNameValue.trim();
                    if (trimmed && activeWorkspace && trimmed !== activeWorkspace.name) {
                      renameWorkspace(activeWorkspace.id, trimmed);
                    }
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') { setEditingName(false); setEditNameValue(headerWorkspaceName); }
                  }}
                  autoFocus
                  aria-label="Workspace name"
                />
              ) : (
                <h1
                  title={`${headerWorkspaceName} (double-click to rename)`}
                  onDoubleClick={() => {
                    if (activeWorkspace) {
                      setEditNameValue(activeWorkspace.name);
                      setEditingName(true);
                    }
                  }}
                >
                  {headerWorkspaceName}
                </h1>
              )}
              {activeWorkspace ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <WorkspaceHealthStrip workspaceId={activeWorkspace.id} />
                  <TokenMeter workspaceId={activeWorkspace.id} />
                </div>
              ) : null}
              {bootstrapError ? (
                <p className="workspace-header__error">{bootstrapError}</p>
              ) : null}
            </div>
          </div>
          <div className="workspace-header__actions">
            <RecoveryBanner />
            <div
              className="workspace-accent"
              style={
                {
                  '--workspace-accent': headerWorkspaceAccent,
                } as CSSProperties
              }
              aria-hidden="true"
              title="Workspace accent color"
            />
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => {
                const current = useUiStore.getState().viewMode;
                useUiStore.getState().setViewMode(current === 'grid' ? 'vertical-tabs' : 'grid');
              }}
              title={`Switch to ${viewMode === 'grid' ? 'vertical tabs' : 'grid'} view`}
              aria-label="Toggle view mode"
            >
              {viewMode === 'grid' ? '⊞' : '≡'}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => useUiStore.getState().openFastLaunchModal()}
              title="Quick launch terminal (Ctrl+K)"
              aria-label="Quick launch terminal"
            >
              ⚡ Quick launch
            </button>
            <button
              type="button"
              className={`btn btn--sm${broadcastOpen ? ' btn--primary' : ''}`}
              onClick={() => setBroadcastOpen(!broadcastOpen)}
              title="Broadcast input to multiple terminals"
              aria-label="Toggle broadcast input"
              aria-pressed={broadcastOpen}
            >
              📡
            </button>
            <button
              type="button"
              className="icon-button shortcuts-button"
              onClick={() => setShortcutsOpen(true)}
              title="Show keyboard shortcuts (Ctrl+.)"
              aria-label="Show keyboard shortcuts"
            >
              <span className="icon-button__icon" aria-hidden="true">
                ⌘
              </span>
            </button>
            <OptionsMenu />
          </div>
        </header>}
        {!settingsOpen && (
          <>
            {diagnostics && showDiagnostics ? (
              <section
                className="diagnostics-banner"
                aria-label="Diagnostics summary"
              >
                <strong>log</strong>
                <span>
                  {diagnostics.latestLogFile
                    ? diagnostics.latestLogFile.split(/[\\/]/).pop()
                    : diagnostics.logDir}
                </span>
                <span aria-hidden="true">·</span>
                <strong>crash reports</strong>
                <span>{diagnostics.recentCrashReports.length}</span>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setShowDiagnostics(false)}
                  aria-label="Hide diagnostics"
                >
                  ✕
                </button>
              </section>
            ) : null}
            <UpdateChecker />
          </>
        )}
        {settingsOpen ? (
          <SettingsPage />
        ) : activeWorkspace ? (
          <>
            <ProjectRulesBanner cwd={activeWorkspace.panes[0]?.cwd} />
            <TerminalLauncher />
            {broadcastOpen ? <BroadcastPanel workspaceId={activeWorkspace.id} /> : null}
            {/* Render ALL workspace grids to keep PTY sessions alive on switch */}
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                style={{ display: ws.id === activeWorkspace.id ? 'contents' : 'none' }}
              >
                <TerminalGrid workspace={ws} />
              </div>
            ))}
          </>
        ) : (
          <>
            <TerminalLauncher />
            <NoWorkspaceEmptyState />
          </>
        )}
        <LogViewer />
        <UndoCloseToast />
      </main>
      <ShortcutsModal />
      <CommandPalette />
      <ErrorBanner />
      <CreateWorkspaceModal />
      <FastLaunchModal />
      <TerminalConfigModal />
      <ActivePaneTracker />
      <CustomThemeInjector />
    </div>
  );
}
