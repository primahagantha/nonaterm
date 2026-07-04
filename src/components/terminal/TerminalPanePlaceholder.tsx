import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { pickFolder } from '@/lib/tauri';
import { TerminalErrorBoundary } from '@/components/terminal/TerminalErrorBoundary';
import { ConfirmDialog } from '@/components/shell/Dialogs';
import { SHELL_PRESETS } from '@/components/modals/toolPresets';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const XtermTerminal = lazy(async () => {
  const module = await import('@/components/terminal/XtermTerminal');
  return { default: module.XtermTerminal };
});

type TerminalPanePlaceholderProps = {
  workspaceId: string;
  paneId: string;
  title: string;
  cwd: string;
  startupCommand: string;
  defaultOpen: boolean;
  shell?: string;
  style?: CSSProperties;
};

/** Placeholder visual agar layout grid bisa divalidasi sebelum xterm dihubungkan. */
export function TerminalPanePlaceholder({
  workspaceId,
  paneId,
  title,
  cwd,
  startupCommand,
  defaultOpen,
  shell,
  style,
}: TerminalPanePlaceholderProps) {
  const session = useTerminalStore((state) => state.sessions[paneId]);
  const workspace = useWorkspaceStore(
    (state) => state.workspaces.find((w) => w.id === workspaceId),
  );
  const pane = workspace?.panes.find((item) => item.id === paneId);
  const updatePane = useWorkspaceStore((state) => state.updatePane);
  const removePane = useWorkspaceStore((state) => state.removePane);
  const passthroughPanes = useSettingsStore(
    (state) => state.passthroughPanes,
  );
  const togglePassthrough = useSettingsStore(
    (state) => state.togglePassthrough,
  );
  const passthroughByDefault = useSettingsStore(
    (state) => state.passthroughByDefault,
  );
  const isPassthrough = passthroughPanes.includes(paneId);

  // Auto-enable passthrough on mount if global default is on
  useEffect(() => {
    if (passthroughByDefault && !passthroughPanes.includes(paneId)) {
      togglePassthrough(paneId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [passthroughSuggestion, setPassthroughSuggestion] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAddonRef = useRef<unknown>(null);
  const [shellPreset, setShellPreset] = useState(
    shell === 'powershell.exe'
      ? 'powershell'
      : shell === 'cmd.exe'
        ? 'cmd'
        : shell?.trim()
          ? 'custom'
          : 'default',
  );
  const [customShell, setCustomShell] = useState(shell ?? '');
  const cwdValue = pane?.cwd ?? cwd;
  const startupValue = pane?.startupCommand ?? startupCommand;

  // Smart-default onboarding: detect shortcut-hungry processes
  useEffect(() => {
    if (isPassthrough || !startupValue?.trim()) return;
    const dismissed = localStorage.getItem(`nonaterm:passthrough-dismissed:${paneId}`);
    if (dismissed) return;
    const cmd = startupValue.trim().toLowerCase();
    const shortcutHungry = ['vim', 'nvim', 'opencode', 'tmux', 'screen', 'htop', 'btop', 'lazygit', 'tig'];
    const match = shortcutHungry.find((name) => cmd.includes(name));
    if (match) {
      setPassthroughSuggestion(match);
    }
  }, [startupValue, isPassthrough, paneId]);

  const dismissPassthroughSuggestion = () => {
    localStorage.setItem(`nonaterm:passthrough-dismissed:${paneId}`, '1');
    setPassthroughSuggestion(null);
  };

  const enablePassthroughFromSuggestion = () => {
    togglePassthrough(paneId);
    dismissPassthroughSuggestion();
  };

  const resolvedShell = useMemo(() => {
    if (shellPreset === 'custom') return customShell.trim() || undefined;
    if (shellPreset === 'default') return undefined;
    // Look up platform-specific shell command from presets
    const preset = SHELL_PRESETS.find((s) => s.id === shellPreset);
    return preset?.command || undefined;
  }, [customShell, shellPreset]);

  const handleBrowseFolder = async () => {
    setBrowseError(null);
    try {
      const folder = await pickFolder();
      if (!folder) {
        return;
      }
      updatePane(workspaceId, paneId, { cwd: folder });
    } catch (error) {
      setBrowseError(
        error instanceof Error ? error.message : 'Failed to open folder picker',
      );
    }
  };

  const handleShellPresetChange = (value: string) => {
    setShellPreset(value);
    updatePane(workspaceId, paneId, {
      shell:
        value === 'powershell'
          ? 'powershell.exe'
          : value === 'cmd'
            ? 'cmd.exe'
            : value === 'custom'
              ? customShell.trim() || undefined
              : undefined,
    });
  };

  const handleCustomShellChange = (value: string) => {
    setCustomShell(value);
    if (shellPreset === 'custom') {
      updatePane(workspaceId, paneId, { shell: value.trim() || undefined });
    }
  };

  const commitTitleRename = () => {
    const newName = editTitleValue.trim();
    if (newName && newName !== title) {
      updatePane(workspaceId, paneId, { title: newName });
    }
    setEditingTitle(false);
  };

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  // Listen for search addon ready event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.paneId === paneId) {
        searchAddonRef.current = detail.searchAddon;
      }
    };
    window.addEventListener('Nonaterm:search-ready', handler);
    return () => window.removeEventListener('Nonaterm:search-ready', handler);
  }, [paneId]);

  // Ctrl+F to open search
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const addon = searchAddonRef.current as { findNext?: (q: string) => void } | null;
    addon?.findNext?.(query);
  };
  const restartPane = () => {
    window.dispatchEvent(
      new CustomEvent('Nonaterm:restart-pane', { detail: { paneId } }),
    );
  };

  const [confirmRemove, setConfirmRemove] = useState(false);
  const handleRemove = () => setConfirmRemove(true);
  const doRemove = () => {
    setConfirmRemove(false);
    removePane(workspaceId, paneId);
  };

  return (
    <article
      className={`terminal-pane${isPassthrough ? ' terminal-pane--passthrough' : ''}`}
      aria-label={title}
      data-testid={`pane-${paneId}`}
      data-pane-id={paneId}
      data-status={session?.status ?? 'idle'}
      data-passthrough={isPassthrough ? 'on' : 'off'}
      style={style}
    >
      <header className="terminal-pane__header">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="terminal-pane__title-input"
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={commitTitleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitleRename();
              if (e.key === 'Escape') { setEditingTitle(false); setEditTitleValue(title); }
            }}
            aria-label="Rename pane"
          />
        ) : (
          <span
            className="terminal-pane__title"
            title={`${title} (double-click to rename)`}
            onDoubleClick={() => { setEditTitleValue(title); setEditingTitle(true); }}
          >
            {title}
          </span>
        )}
        <div className="terminal-pane__meta">
          <div className="terminal-pane__action-row">
            <button
              className={`terminal-pane__passthrough-btn${isPassthrough ? ' terminal-pane__passthrough-btn--active' : ''}`}
              type="button"
              onClick={() => togglePassthrough(paneId)}
              aria-label="Toggle passthrough mode"
              aria-pressed={isPassthrough}
              title={isPassthrough ? 'Passthrough Mode: ON (click to disable)' : 'Passthrough Mode: OFF (click to enable)'}
            >
              ⇄
            </button>

            <button
              className="terminal-pane__action"
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              aria-label={isOpen ? 'Close terminal' : 'Open terminal'}
              title={isOpen ? 'Close terminal' : 'Open terminal'}
            >
              {isOpen ? '✕' : '▷'}
            </button>
            <button
              className="terminal-pane__action"
              type="button"
              onClick={restartPane}
              disabled={!isOpen}
              aria-label="Restart pane"
              title="Restart pane"
            >
              ↻
            </button>
            <button
              className="terminal-pane__action terminal-pane__action--danger"
              type="button"
              onClick={handleRemove}
              aria-label="Remove this pane"
              title="Remove this pane"
            >
              🗑
            </button>
          </div>
        </div>
      </header>
      {searchOpen ? (
        <div className="terminal-pane__search">
          <input
            ref={searchInputRef}
            type="text"
            className="terminal-pane__search-input"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
              if (e.key === 'Enter') handleSearch(searchQuery);
            }}
            aria-label="Search terminal"
          />
          <button type="button" className="terminal-pane__action" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} aria-label="Close search">✕</button>
        </div>
      ) : null}
      <div className="terminal-pane__controls">
        <label className="terminal-pane__label">
          Shell
          <select
            className="terminal-pane__select"
            value={shellPreset}
            onChange={(event) => handleShellPresetChange(event.target.value)}
          >
            <option value="powershell">PowerShell</option>
            <option value="pwsh">PowerShell 7</option>
            <option value="cmd">CMD</option>
            <option value="gitbash">Git Bash</option>
            <option value="wsl">WSL</option>
            <option value="default">Default</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="terminal-pane__label terminal-pane__label--grow">
          Folder
          <input
            className="terminal-pane__input"
            value={cwdValue}
            onChange={(event) =>
              updatePane(workspaceId, paneId, { cwd: event.target.value })
            }
            placeholder="Select or type working directory"
          />
        </label>
        <button
          className="btn btn--sm"
          type="button"
          onClick={() => void handleBrowseFolder()}
        >
          Browse…
        </button>
        {shellPreset === 'custom' ? (
          <input
            className="terminal-pane__input terminal-pane__input--shell"
            value={customShell}
            onChange={(event) => handleCustomShellChange(event.target.value)}
            placeholder="git-bash.exe / laragon / ssh shell"
          />
        ) : null}
        <label className="terminal-pane__label terminal-pane__label--grow">
          Startup
          <input
            className="terminal-pane__input"
            value={startupValue}
            onChange={(event) =>
              updatePane(workspaceId, paneId, {
                startupCommand: event.target.value,
              })
            }
            placeholder="Optional startup command"
          />
        </label>
      </div>
      {browseError ? (
        <p className="terminal-pane__error">{browseError}</p>
      ) : null}
      <div className="terminal-pane__body">
        {isOpen ? (
          <TerminalErrorBoundary paneId={paneId}>
            <Suspense
              fallback={
                <div className="terminal-pane__loading">
                  <div className="terminal-pane__loading-spinner" />
                  <span>Initializing terminal…</span>
                </div>
              }
            >
              <XtermTerminal
                workspaceId={workspaceId}
                paneId={paneId}
                cwd={cwdValue}
                title={title}
                startupCommand={startupValue}
                shell={resolvedShell}
                workspaceFont={workspace?.fontFamily}
              />
            </Suspense>
          </TerminalErrorBoundary>
        ) : (
          <div className="terminal-pane__loading">Terminal closed. Click ▷ to open.</div>
        )}
        {isPassthrough ? (
          <div className="terminal-pane__passthrough" role="status">
            <span aria-hidden="true">⤳</span>
            Passthrough Mode — all shortcuts forwarded to the program
            inside this pane. Press <kbd>Ctrl+Shift+Esc</kbd> to exit.
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => togglePassthrough(paneId)}
            >
              Exit Passthrough
            </button>
          </div>
        ) : null}
        {passthroughSuggestion && !isPassthrough ? (
          <div className="terminal-pane__suggestion" role="status">
            <span>Detected <strong>{passthroughSuggestion}</strong> — enable Passthrough Mode so its shortcuts aren't intercepted?</span>
            <button type="button" className="btn btn--sm btn--primary" onClick={enablePassthroughFromSuggestion}>
              Enable
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={dismissPassthroughSuggestion}>
              Dismiss
            </button>
          </div>
        ) : null}
        {session?.errorMessage ? (
          <p className="terminal-pane__error">{session.errorMessage}</p>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmRemove}
        title={`Remove "${title}"?`}
        body="The terminal session will be closed."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={doRemove}
        onCancel={() => setConfirmRemove(false)}
      />
    </article>
  );
}
