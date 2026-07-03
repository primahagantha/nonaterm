import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  isTauriRuntime,
  pickFolder,
  pickTemplateFile,
  stateExportConfig,
  stateImportConfig,
  stateSaveSnapshot,
  systemRegisterGlobalHotkey,
  systemUnregisterGlobalHotkey,
  templatesExport,
  templatesImport,
  templatesList,
  templatesMaterialize,
} from '@/lib/tauri';
import { AISettingsPanel } from '@/components/shell/AISettingsPanel';
import { PromptDialog } from '@/components/shell/Dialogs';
import { WorktreePanel } from '@/components/shell/WorktreePanel';
import {
  comboLabel,
  combosEqual,
  comboFromEvent,
  type KeybindId,
} from '@/lib/keybind';
import {
  THEMES,
  useSettingsStore,
  type ThemeId,
  type ThemeMode,
} from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getKeybindRegistry } from '@/lib/keybindBootstrap';
import type { ExportPayload, WorkspaceTemplate } from '@/types';

type OptionsSection = 'appearance' | 'config' | 'templates' | 'keybinds' | 'snippets' | 'vault' | 'ai' | 'worktree' | 'about';

const FONT_CHOICES = [
  { value: 'Cascadia Code, ui-monospace, monospace', label: 'Cascadia Code' },
  { value: 'Consolas, "Courier New", monospace', label: 'Consolas' },
  { value: 'Menlo, "DejaVu Sans Mono", monospace', label: 'Menlo' },
  { value: '"JetBrains Mono", "Fira Code", monospace', label: 'JetBrains Mono' },
  { value: '"Fira Code", "Cascadia Code", monospace', label: 'Fira Code' },
  { value: 'ui-monospace, SFMono-Regular, monospace', label: 'System mono' },
];

function ThemeCard({
  themeId,
  active,
  onClick,
}: {
  themeId: ThemeId;
  active: boolean;
  onClick: () => void;
}) {
  const def = THEMES[themeId];
  return (
    <button
      type="button"
      role="radio"
      className={`theme-card${active ? ' theme-card--active' : ''}`}
      onClick={onClick}
      aria-checked={active}
    >
      <div className="theme-card__swatch" aria-hidden="true">
        <span style={{ background: def.preview.bg }} />
        <span style={{ background: def.preview.panel }} />
        <span style={{ background: def.preview.text }} />
        <span style={{ background: def.preview.accent }} />
      </div>
      <div className="theme-card__info">
        <span className="theme-card__name">{def.label}</span>
        <span className="theme-card__desc">{def.description}</span>
      </div>
    </button>
  );
}

/** Global hotkey configuration field. */
function GlobalHotkeyField() {
  const globalHotkey = useSettingsStore((state) => state.globalHotkey);
  const setGlobalHotkey = useSettingsStore((state) => state.setGlobalHotkey);
  const [recording, setRecording] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState('');

  const startRecording = () => {
    setRecording(true);
    setRecordedCombo('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    // Build combo string
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');

    // Skip modifier-only keys
    const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
    if (modifierKeys.includes(e.key)) return;

    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    const combo = parts.join('+');
    setRecordedCombo(combo);
    setGlobalHotkey(combo);
    setRecording(false);
  };

  return (
    <div className="options-menu__field">
      <span className="options-menu__label">Global Hotkey</span>
      <p className="options-menu__hint">
        System-wide hotkey to show/hide Nonaterm from any application.
        Leave empty to disable.
      </p>
      <div className="options-menu__field-row">
        <input
          className="options-menu__input"
          value={recording ? recordedCombo || 'Press keys...' : globalHotkey}
          readOnly
          onClick={startRecording}
          onKeyDown={handleKeyDown}
          onBlur={() => setRecording(false)}
          placeholder="Click to set hotkey"
          aria-label="Global hotkey"
          style={{ cursor: 'pointer', minWidth: 160 }}
        />
        {globalHotkey ? (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => setGlobalHotkey('')}
          >
            Clear
          </button>
        ) : null}
      </div>
      {recording ? (
        <p className="options-menu__hint" style={{ color: 'var(--tw-accent)' }}>
          Press the key combination you want to use...
        </p>
      ) : null}
    </div>
  );
}

/** Top-right options menu consolidating theme, export/import, and metadata. */
export function OptionsMenu() {
  const optionsOpen = useSettingsStore((state) => state.optionsOpen);
  const setOptionsOpen = useSettingsStore((state) => state.setOptionsOpen);
  const toggleOptions = useSettingsStore((state) => state.toggleOptions);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const themeId = useSettingsStore((state) => state.themeId);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const fontFamily = useSettingsStore((state) => state.fontFamily);
  const setFontFamily = useSettingsStore((state) => state.setFontFamily);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const setShortcutsOpen = useSettingsStore((state) => state.setShortcutsOpen);
  const logVisible = useSettingsStore((state) => state.logVisible);
  const setLogVisible = useSettingsStore((state) => state.setLogVisible);
  const customThemeCSS = useSettingsStore((state) => state.customThemeCSS);
  const setCustomThemeCSS = useSettingsStore((state) => state.setCustomThemeCSS);

  const appInfo = useUiStore((state) => state.appInfo);
  const diagnostics = useUiStore((state) => state.diagnostics);
  const backendStatus = useUiStore((state) => state.backendStatus);

  const hydrateFromSnapshot = useWorkspaceStore(
    (state) => state.hydrateFromSnapshot,
  );

  const [section, setSection] = useState<OptionsSection>('appearance');
  const [status, setStatus] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!optionsOpen) {
      setStatus(null);
      return;
    }
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOptionsOpen(false);
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
    };
  }, [optionsOpen, setOptionsOpen]);

  const handleExport = async () => {
    setStatus(null);
    try {
      const payload = await stateExportConfig();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const date = new Date().toISOString().slice(0, 10);
      anchor.download = `Nonaterm-config-${date}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus({
        kind: 'success',
        text: `Exported ${payload.workspaces.length} workspace(s).`,
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () =>
          reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsText(file);
      });
      const count = await stateImportConfig(text);
      const payload = JSON.parse(text) as ExportPayload;
      hydrateFromSnapshot(payload.activeWorkspaceId, payload.workspaces);
      setStatus({ kind: 'success', text: `Imported ${count} workspace(s).` });
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSnapshot = async () => {
    setStatus(null);
    try {
      const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
      await stateSaveSnapshot({
        activeWorkspaceId,
        workspaces,
        savedAt: new Date().toISOString(),
      });
      setStatus({ kind: 'success', text: 'Snapshot saved to disk.' });
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleThemePick = (id: ThemeId) => {
    setTheme(id, themeMode);
  };

  const handleModePick = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <div className="options-menu">
      <button
        type="button"
        className="icon-button options-menu__trigger icon-button--primary"
        onClick={toggleOptions}
        aria-haspopup="menu"
        aria-expanded={optionsOpen}
        aria-label="Open options menu (Ctrl+,)"
        title="Options (Ctrl+,)"
      >
        <span className="icon-button__icon options-menu__icon" aria-hidden="true">
          ⚙
        </span>
      </button>
      {optionsOpen ? (
        <>
        <div
          className="options-menu__backdrop"
          onClick={() => setOptionsOpen(false)}
          aria-hidden="true"
        />
        <div
          className="options-menu__panel"
          role="dialog"
          aria-label="Options"
          ref={panelRef}
        >
          <div className="options-menu__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={section === 'appearance'}
              className={`options-menu__tab${section === 'appearance' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('appearance')}
            >
              Appearance
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'config'}
              className={`options-menu__tab${section === 'config' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('config')}
            >
              Config
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'ai'}
              className={`options-menu__tab${section === 'ai' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('ai')}
            >
              AI
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'worktree'}
              className={`options-menu__tab${section === 'worktree' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('worktree')}
            >
              Git
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'about'}
              className={`options-menu__tab${section === 'about' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('about')}
            >
              About
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'templates'}
              className={`options-menu__tab${section === 'templates' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('templates')}
            >
              Templates
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'keybinds'}
              className={`options-menu__tab${section === 'keybinds' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('keybinds')}
            >
              Keybinds
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'vault'}
              className={`options-menu__tab${section === 'vault' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('vault')}
            >
              🔐 Vault
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'snippets'}
              className={`options-menu__tab${section === 'snippets' ? ' options-menu__tab--active' : ''}`}
              onClick={() => setSection('snippets')}
            >
              Snippets
            </button>
          </div>

          <div className="options-menu__content">
            {section === 'appearance' ? (
              <div className="options-menu__section">
                <div className="options-menu__field">
                  <span className="options-menu__label">Theme</span>
                  <div className="theme-grid" role="radiogroup">
                    {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                      <ThemeCard
                        key={id}
                        themeId={id}
                        active={themeId === id}
                        onClick={() => handleThemePick(id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="options-menu__field">
                  <span className="options-menu__label">Mode</span>
                  <div className="mode-toggle" role="radiogroup">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={themeMode === 'light'}
                      className={`mode-toggle__btn${themeMode === 'light' ? ' mode-toggle__btn--active' : ''}`}
                      onClick={() => handleModePick('light')}
                    >
                      <span aria-hidden="true">☀</span>
                      Light
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={themeMode === 'dark'}
                      className={`mode-toggle__btn${themeMode === 'dark' ? ' mode-toggle__btn--active' : ''}`}
                      onClick={() => handleModePick('dark')}
                    >
                      <span aria-hidden="true">☾</span>
                      Dark
                    </button>
                  </div>
                </div>

                <div className="options-menu__field">
                  <label
                    className="options-menu__label"
                    htmlFor="options-font"
                  >
                    Terminal font
                  </label>
                  <select
                    id="options-font"
                    className="options-menu__select"
                    value={fontFamily}
                    onChange={(event) => setFontFamily(event.target.value)}
                  >
                    {FONT_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="options-menu__field">
                  <label
                    className="options-menu__label"
                    htmlFor="options-font-size"
                  >
                    Terminal font size
                  </label>
                  <div className="slider-row">
                    <input
                      id="options-font-size"
                      type="range"
                      className="slider"
                      min={8}
                      max={32}
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                    />
                    <span className="slider-row__value">{fontSize}px</span>
                  </div>
                </div>

                <div className="options-menu__field">
                  <span className="options-menu__label">Log viewer</span>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={logVisible}
                      onChange={(e) => setLogVisible(e.target.checked)}
                    />
                    <span className="toggle-switch" />
                    <span className="toggle-label">
                      Show log panel at bottom
                    </span>
                  </label>
                </div>

                <div className="options-menu__field">
                  <label
                    className="options-menu__label"
                    htmlFor="custom-theme-css"
                  >
                    Custom theme CSS
                  </label>
                  <p className="options-menu__hint">
                    Override theme variables. Example:
                    <br />
                    <code className="code-inline">
                      --tw-bg: #0a0a0a; --tw-accent: #ff6b6b;
                    </code>
                  </p>
                  <textarea
                    id="custom-theme-css"
                    className="custom-theme-textarea"
                    value={customThemeCSS}
                    onChange={(e) => setCustomThemeCSS(e.target.value)}
                    placeholder={'--tw-bg: #0a0a0a;\n--tw-accent: #ff6b6b;'}
                    rows={4}
                    spellCheck={false}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {customThemeCSS.trim() ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setCustomThemeCSS('')}
                      >
                        Clear custom CSS
                      </button>
                    ) : null}
                    <a
                      href="https://github.com/primahagantha/nonaterm-app/blob/master/docs/theme-docs.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--ghost btn--sm"
                    >
                      Theme docs
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShortcutsOpen(true)}
                  style={{ justifyContent: 'flex-start' }}
                >
                  View keyboard shortcuts
                  <span className="kbd-hint">⌃.</span>
                </button>

                <AutoRestartControls />

                <GlobalHotkeyControls />

                <TerminalSettingsControls />
              </div>
            ) : null}

            {section === 'config' ? (
              <div className="options-menu__section">
                <div className="options-menu__field">
                  <span className="options-menu__label">Backup &amp; restore</span>
                  <p className="options-menu__hint">
                    Save the entire workspace layout to a JSON file you can
                    share or restore on another machine.
                  </p>
                  <div className="options-menu__field-row">
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => void handleExport()}
                    >
                      Export…
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Import…
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImport}
                      aria-label="Import config file"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div className="options-menu__field">
                  <span className="options-menu__label">Snapshot</span>
                  <p className="options-menu__hint">
                    Force-write the current workspace state to the autosave
                    database. Use this before risky edits.
                  </p>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => void handleSnapshot()}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    Save snapshot now
                  </button>
                </div>

                <GlobalHotkeyField />

                {status ? (
                  <p
                    className={`options-menu__status options-menu__status--${status.kind}`}
                    role="status"
                  >
                    {status.text}
                  </p>
                ) : null}
              </div>
            ) : null}

            {section === 'ai' ? <AISettingsPanel /> : null}
            {section === 'worktree' ? <WorktreePanel cwd={undefined} /> : null}
            {section === 'about' ? (
              <div className="options-menu__section">
                <dl className="options-menu__meta">
                  <div>
                    <dt>App</dt>
                    <dd>
                      {appInfo
                        ? `${appInfo.name} v${appInfo.version}`
                        : 'Nonaterm'}
                    </dd>
                  </div>
                  <div>
                    <dt>Platform</dt>
                    <dd>{appInfo?.platform ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Backend</dt>
                    <dd>{backendStatus}</dd>
                  </div>
                  <div>
                    <dt>Log directory</dt>
                    <dd>{diagnostics?.logDir ?? '—'}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
            {section === 'keybinds' ? <KeybindsPanel /> : null}
            {section === 'vault' ? <VaultPanel /> : null}
            {section === 'snippets' ? <SnippetsPanel /> : null}
            {section === 'templates' ? <TemplatesPanel /> : null}
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}

function TemplatesPanel() {
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [ioPending, setIoPending] = useState<'export' | 'import' | null>(null);
  const [exportPrompt, setExportPrompt] = useState<{
    activeWorkspaceId: string;
    suggestedName: string;
  } | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    templatesList()
      .then((list) => {
        if (!cancelled) {
          setTemplates(list);
          setTemplatesLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load templates');
          setTemplatesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExportClick = () => {
    setMessage(null);
    setError(null);
    const activeId = useWorkspaceStore.getState().activeWorkspaceId;
    if (!activeId) {
      setError('No active workspace to export.');
      return;
    }
    const activeWorkspace = useWorkspaceStore
      .getState()
      .workspaces.find((ws) => ws.id === activeId);
    const suggestedName = activeWorkspace?.name?.trim() || 'my-template';
    setExportPrompt({ activeWorkspaceId: activeId, suggestedName });
  };

  const handleExportConfirm = async (name: string) => {
    if (!exportPrompt) {
      return;
    }
    setExportPrompt(null);
    let folder: string | null = null;
    try {
      folder = await pickFolder();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    if (!folder) {
      return;
    }
    const safeName = name.replace(/[^a-zA-Z0-9-_ ]/g, '_').trim();
    const sep = folder.includes('\\') ? '\\' : '/';
    const target = `${folder}${sep}${safeName}.json`;
    setIoPending('export');
    try {
      await templatesExport(exportPrompt.activeWorkspaceId, name, target);
      setMessage(`Saved template "${name}" to ${target}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export template');
    } finally {
      setIoPending(null);
    }
  };

  const handleImport = async () => {
    setMessage(null);
    setError(null);
    let path: string | null = null;
    try {
      path = await pickTemplateFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    if (!path) {
      return;
    }
    setIoPending('import');
    try {
      const template = await templatesImport(path);
      // Materialize via existing builtin flow (creates a workspace
      // with the right id + accent + layout) then layer panes from
      // the imported template. If the imported id collides with a
      // builtin, templatesMaterialize would fail — but imported
      // templates usually have arbitrary ids, so fall through to a
      // direct createWorkspace path.
      let result;
      try {
        result = await templatesMaterialize(template.id, template.label);
      } catch {
        result = null;
      }
      if (result) {
        createWorkspace(result.name, result.accentColor, '');
      } else {
        createWorkspace(template.label, template.accentColor, '');
      }
      const targetWsId =
        useWorkspaceStore.getState().activeWorkspaceId;
      const firstPane = template.panes[0];
      if (firstPane) {
        useWorkspaceStore.getState().updatePane(targetWsId, `${targetWsId}-pane-1`, {
          title: firstPane.title,
          startupCommand: firstPane.startupCommand,
          shell: firstPane.shell ?? undefined,
        });
      }
      if (template.panes.length > 1) {
        const rest = template.panes.slice(1).map(
          (p: WorkspaceTemplate['panes'][number], index: number) => ({
            id: `${targetWsId}-pane-${index + 2}`,
            title: p.title,
            cwd: '',
            startupCommand: p.startupCommand,
            shell: p.shell ?? undefined,
          }),
        );
        useWorkspaceStore.getState().addPanesBatch(targetWsId, rest);
      }
      setMessage(
        `Imported "${template.label}" with ${template.panes.length} pane(s) from ${path}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import template');
    } finally {
      setIoPending(null);
    }
  };

  const handleUse = async (template: WorkspaceTemplate) => {
    setMessage(null);
    setError(null);
    setPendingId(template.id);
    try {
      const result = await templatesMaterialize(template.id, template.label);
      // MaterializedWorkspace describes the workspace id + metadata; the
      // frontend uses its existing createWorkspace action which already
      // seeds a 1-pane workspace. For template pane counts beyond 1 we
      // add the remaining panes via addPanesBatch.
      createWorkspace(result.name, result.accentColor, '');
      const initialPane = {
        id: `${result.id}-pane-1`,
        title: template.panes[0]?.title ?? 'Pane 1',
        cwd: '',
        startupCommand: template.panes[0]?.startupCommand ?? '',
        shell: template.panes[0]?.shell ?? undefined,
      };
      const remaining = template.panes.slice(1).map(
        (p: WorkspaceTemplate['panes'][number], index: number) => ({
          id: `${result.id}-pane-${index + 2}`,
          title: p.title,
        cwd: '',
        startupCommand: p.startupCommand,
        shell: p.shell ?? undefined,
      }));
      const allPanes = [initialPane, ...remaining];
      // First pane is auto-created by createWorkspace; replace it via
      // update to mirror the template's shell + startup, then add rest.
      useWorkspaceStore
        .getState()
        .updatePane(result.id, allPanes[0].id, {
          title: allPanes[0].title,
          startupCommand: allPanes[0].startupCommand,
          shell: allPanes[0].shell,
        });
      if (allPanes.length > 1) {
        useWorkspaceStore
          .getState()
          .addPanesBatch(result.id, allPanes.slice(1));
      }
      setMessage(
        `Created "${result.name}" with ${result.paneCount} pane(s) from template "${template.label}".`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to materialise template',
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="options-menu__section">
      <div className="keybinds-panel__intro">
        <span className="options-menu__label">Workspace templates</span>
        <p className="options-menu__hint">
          Spin up a pre-configured workspace with one click. Pane shell,
          cwd, and startup command are pre-filled so you can hit the
          ground running.
        </p>
      </div>
      <div className="options-menu__field-row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => void handleExportClick()}
          disabled={ioPending !== null}
          data-testid="template-export"
        >
          {ioPending === 'export' ? 'Saving…' : 'Save current as template…'}
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => void handleImport()}
          disabled={ioPending !== null}
          data-testid="template-import"
        >
          {ioPending === 'import' ? 'Importing…' : 'Import from file…'}
        </button>
      </div>
      {error ? (
        <p className="keybinds-list__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="options-menu__status options-menu__status--success" role="status">
          {message}
        </p>
      ) : null}
      <ul className="templates-grid">
        {templatesLoading ? (
          <li className="templates-grid__loading">Loading templates…</li>
        ) : null}
        {!templatesLoading && templates.length === 0 ? (
          <li className="templates-grid__empty">
            No templates available. Backend may not be ready.
          </li>
        ) : null}
        {templates.map((template) => (
          <li
            key={template.id}
            className="template-card"
            style={
              {
                '--template-accent': template.accentColor,
              } as React.CSSProperties
            }
          >
            <div className="template-card__header">
              <span
                className="template-card__swatch"
                aria-hidden="true"
              />
              <span className="template-card__name">{template.label}</span>
              <span className="template-card__count">
                {template.panes.length} pane{template.panes.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="template-card__desc">{template.description}</p>
            <ul className="template-card__panes">
              {template.panes.map((pane: WorkspaceTemplate['panes'][number]) => (
                <li key={pane.title}>{pane.title}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => void handleUse(template)}
              disabled={pendingId === template.id}
              data-testid={`template-use-${template.id}`}
            >
              {pendingId === template.id ? 'Creating…' : 'Use template'}
            </button>
          </li>
        ))}
      </ul>

      <PromptDialog
        open={exportPrompt !== null}
        title="Save as template"
        body={
          <p>
            Save the current workspace as a reusable template. You'll be
            asked for a destination folder next.
          </p>
        }
        label="Template name"
        defaultValue={exportPrompt?.suggestedName ?? ''}
        placeholder="my-template"
        confirmLabel="Choose folder…"
        validate={(value) =>
          value.trim().length > 0 ? null : 'Template name must not be empty'
        }
        onConfirm={handleExportConfirm}
        onCancel={() => setExportPrompt(null)}
      />
    </div>
  );
}

function KeybindsPanel() {
  const registry = getKeybindRegistry();
  const overrides = useSettingsStore((state) => state.keybindOverrides);
  const setKeybindOverride = useSettingsStore(
    (state) => state.setKeybindOverride,
  );
  const resetKeybinds = useSettingsStore((state) => state.resetKeybinds);
  const [, force] = useState(0);
  const [recording, setRecording] = useState<KeybindId | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    return registry.subscribe(() => force((n) => n + 1));
  }, [registry]);

  const entries = registry.list();
  const conflictMap = useMemo(() => {
    const map = new Map<KeybindId, KeybindId[]>();
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        if (combosEqual(entries[i].combo, entries[j].combo)) {
          const a = map.get(entries[i].id) ?? [];
          a.push(entries[j].id);
          map.set(entries[i].id, a);
          const b = map.get(entries[j].id) ?? [];
          b.push(entries[i].id);
          map.set(entries[j].id, b);
        }
      }
    }
    return map;
  }, [entries]);

  const handleRecord = (id: KeybindId) => {
    setCaptureError(null);
    setRecording(id);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!recording) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      setRecording(null);
      return;
    }
    const combo = comboFromEvent(event);
    if (!combo.key) {
      return;
    }
    // Require at least one modifier to avoid blocking single-letter
    // bindings that we currently consider global.
    if (!combo.ctrl && !combo.alt && !combo.meta && combo.key.length === 1) {
      setCaptureError(
        'Add at least one modifier (Ctrl/Alt/Meta) to avoid clashing with terminal input.',
      );
      return;
    }
    registry.rebind(recording, combo);
    setKeybindOverride(recording, combo);
    setRecording(null);
  };

  useEffect(() => {
    if (!recording) {
      return;
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true } as unknown as EventListenerOptions);
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = (id: KeybindId) => {
    setKeybindOverride(id, null);
    // Re-register the binding to revert the combo.
    // The simplest path is to trigger a registry refresh by calling
    // setOverrides with a no-op — we mutate the override map in
    // settings and reload.
    registry.setOverrides({ ...overrides });
  };

  const handleResetAll = () => {
    resetKeybinds();
    registry.setOverrides({});
  };

  return (
    <div className="options-menu__section">
      <div className="keybinds-panel__intro">
        <span className="options-menu__label">Keyboard shortcuts</span>
        <p className="options-menu__hint">
          Press the record button next to a binding, then press the new
          chord. Press <span className="kbd-hint">Esc</span> to cancel.
        </p>
      </div>
      <ul className="keybinds-list">
        {entries.map((entry) => {
          const isOverridden = overrides[entry.id] !== undefined;
          const conflictIds = conflictMap.get(entry.id) ?? [];
          const conflict = conflictIds.length > 0 && isOverridden;
          return (
            <li
              key={entry.id}
              className={`keybinds-list__item${conflict ? ' keybinds-list__item--conflict' : ''}`}
            >
              <div className="keybinds-list__label">
                <span className="keybinds-list__name">{entry.description}</span>
                {isOverridden ? (
                  <span className="keybinds-list__badge">overridden</span>
                ) : null}
                {conflict ? (
                  <span className="keybinds-list__badge keybinds-list__badge--warn">
                    conflict
                  </span>
                ) : null}
              </div>
              <div className="keybinds-list__control">
                <kbd className="keybinds-list__combo">
                  {comboLabel(entry.combo)}
                </kbd>
                {recording === entry.id ? (
                  <span className="keybinds-list__recording" role="status">
                    Press a chord…
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => handleRecord(entry.id)}
                    data-testid={`rebind-${entry.id}`}
                  >
                    Record
                  </button>
                )}
                {isOverridden ? (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => handleReset(entry.id)}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {captureError ? (
        <p className="keybinds-list__error" role="alert">
          {captureError}
        </p>
      ) : null}
      <div className="keybinds-panel__footer">
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={handleResetAll}
        >
          Reset all to defaults
        </button>
      </div>
    </div>
  );
}

function AutoRestartControls() {
  const autoRestart = useSettingsStore((state) => state.autoRestart);
  const setAutoRestart = useSettingsStore((state) => state.setAutoRestart);

  return (
    <div className="options-menu__field">
      <span className="options-menu__label">Auto-restart shell</span>
      <p className="options-menu__hint">
        When a pane exits with a non-zero code, restart it automatically
        up to the configured limit. Use the Manual Restart button on the
        pane header to retry sooner or reset the counter.
      </p>
      <label className="options-menu__radio" style={{ justifyContent: 'flex-start' }}>
        <input
          type="checkbox"
          checked={autoRestart.enabled}
          onChange={(event) =>
            setAutoRestart({ enabled: event.target.checked })
          }
        />
        <span>Enable auto-restart on non-zero exit</span>
      </label>
      <div className="slider-row">
        <input
          id="options-restart-max"
          type="range"
          className="slider"
          min={1}
          max={10}
          value={autoRestart.maxAttempts}
          onChange={(event) =>
            setAutoRestart({ maxAttempts: Number(event.target.value) })
          }
          disabled={!autoRestart.enabled}
        />
        <span className="slider-row__value">
          {autoRestart.maxAttempts} attempt{autoRestart.maxAttempts > 1 ? 's' : ''}
        </span>
      </div>
      <div className="slider-row">
        <input
          id="options-restart-backoff"
          type="range"
          className="slider"
          min={250}
          max={10000}
          step={250}
          value={autoRestart.backoffMs}
          onChange={(event) =>
            setAutoRestart({ backoffMs: Number(event.target.value) })
          }
          disabled={!autoRestart.enabled}
        />
        <span className="slider-row__value">
          {autoRestart.backoffMs >= 1000
            ? `${(autoRestart.backoffMs / 1000).toFixed(1)}s`
            : `${autoRestart.backoffMs}ms`}
        </span>
      </div>
    </div>
  );
}

function TerminalSettingsControls() {
  const scrollback = useSettingsStore((s) => s.terminalScrollback);
  const setScrollback = useSettingsStore((s) => s.setTerminalScrollback);
  const bell = useSettingsStore((s) => s.terminalBell);
  const setBell = useSettingsStore((s) => s.setTerminalBell);
  const copyOnSelect = useSettingsStore((s) => s.terminalCopyOnSelect);
  const setCopyOnSelect = useSettingsStore((s) => s.setTerminalCopyOnSelect);
  const passthroughByDefault = useSettingsStore((s) => s.passthroughByDefault);
  const setPassthroughByDefault = useSettingsStore((s) => s.setPassthroughByDefault);
  const autoRestart = useSettingsStore((s) => s.autoRestart);
  const setAutoRestart = useSettingsStore((s) => s.setAutoRestart);

  return (
    <div className="options-menu__field">
      <span className="options-menu__label">Terminal</span>
      <div className="slider-row">
        <label className="options-menu__hint" htmlFor="options-scrollback">
          Scrollback buffer
        </label>
        <input
          id="options-scrollback"
          type="range"
          className="slider"
          min={100}
          max={10000}
          step={100}
          value={scrollback}
          onChange={(e) => setScrollback(Number(e.target.value))}
        />
        <span className="slider-row__value">{scrollback}</span>
      </div>
      <label className="options-menu__radio" style={{ justifyContent: 'flex-start' }}>
        <select
          className="options-menu__select"
          value={bell}
          onChange={(e) => setBell(e.target.value as 'none' | 'visual' | 'sound')}
        >
          <option value="none">No bell</option>
          <option value="visual">Visual bell (flash)</option>
          <option value="sound">Sound bell</option>
        </select>
      </label>
      <label className="options-menu__radio" style={{ justifyContent: 'flex-start' }}>
        <input
          type="checkbox"
          checked={copyOnSelect}
          onChange={(e) => setCopyOnSelect(e.target.checked)}
        />
        <span>Copy on select (auto-copy selection to clipboard)</span>
      </label>
      <label className="options-menu__radio" style={{ justifyContent: 'flex-start' }}>
        <input
          type="checkbox"
          checked={passthroughByDefault}
          onChange={(e) => setPassthroughByDefault(e.target.checked)}
        />
        <span>Passthrough mode ON by default for new panes</span>
      </label>

      <span className="options-menu__label" style={{ marginTop: '0.75rem' }}>Auto-restart</span>
      <label className="options-menu__radio" style={{ justifyContent: 'flex-start' }}>
        <input
          type="checkbox"
          checked={autoRestart.enabled}
          onChange={(e) => setAutoRestart({ enabled: e.target.checked })}
        />
        <span>Auto-restart shell on crash</span>
      </label>
      {autoRestart.enabled ? (
        <>
          <div className="slider-row">
            <label className="options-menu__hint" htmlFor="options-max-attempts">
              Max retry attempts
            </label>
            <input
              id="options-max-attempts"
              type="range"
              className="slider"
              min={1}
              max={10}
              step={1}
              value={autoRestart.maxAttempts}
              onChange={(e) => setAutoRestart({ maxAttempts: Number(e.target.value) })}
            />
            <span className="slider-row__value">{autoRestart.maxAttempts}</span>
          </div>
          <div className="slider-row">
            <label className="options-menu__hint" htmlFor="options-backoff-ms">
              Backoff delay (ms)
            </label>
            <input
              id="options-backoff-ms"
              type="range"
              className="slider"
              min={500}
              max={10000}
              step={500}
              value={autoRestart.backoffMs}
              onChange={(e) => setAutoRestart({ backoffMs: Number(e.target.value) })}
            />
            <span className="slider-row__value">{autoRestart.backoffMs}ms</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SnippetsPanel() {
  const snippets = useSettingsStore((s) => s.snippets);
  const addSnippet = useSettingsStore((s) => s.addSnippet);
  const removeSnippet = useSettingsStore((s) => s.removeSnippet);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');

  const handleAdd = () => {
    if (name.trim() && command.trim()) {
      addSnippet(name.trim(), command.trim());
      setName('');
      setCommand('');
    }
  };

  return (
    <div className="options-menu__section">
      <span className="options-menu__label">Saved snippets</span>
      <p className="options-menu__hint">
        Save frequently used commands for quick insertion.
      </p>
      <div className="options-menu__field-row">
        <input
          type="text"
          className="options-menu__select"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          type="text"
          className="options-menu__select"
          placeholder="Command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          style={{ flex: 2 }}
        />
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={handleAdd}
          disabled={!name.trim() || !command.trim()}
        >
          Add
        </button>
      </div>
      {snippets.length === 0 ? (
        <p className="options-menu__hint">No snippets saved yet.</p>
      ) : (
        <ul className="keybinds-list">
          {snippets.map((s, i) => (
            <li key={i} className="keybinds-list__item">
              <div className="keybinds-list__label">
                <span className="keybinds-list__name">{s.name}</span>
              </div>
              <div className="keybinds-list__control">
                <kbd className="keybinds-list__combo">{s.command}</kbd>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => removeSnippet(i)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GlobalHotkeyControls() {
  const [hotkey, setHotkey] = useState(() =>
    localStorage.getItem('nonaterm:global-hotkey') || '',
  );
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecording(false);
        return;
      }
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Super');
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      if (parts.length >= 2) {
        const combo = parts.join('+');
        setHotkey(combo);
        setRecording(false);
        localStorage.setItem('nonaterm:global-hotkey', combo);
        if (isTauriRuntime()) {
          systemRegisterGlobalHotkey(combo).catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to register hotkey');
          });
        }
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [recording]);

  const handleClear = () => {
    if (hotkey && isTauriRuntime()) {
      systemUnregisterGlobalHotkey(hotkey).catch(() => {});
    }
    setHotkey('');
    localStorage.removeItem('nonaterm:global-hotkey');
  };

  return (
    <div className="options-menu__field">
      <span className="options-menu__label">Global hotkey</span>
      <p className="options-menu__hint">
        Press a key combination to toggle show/hide Nonaterm from anywhere.
      </p>
      <div className="options-menu__field-row">
        {recording ? (
          <span className="keybinds-list__recording" role="status">Press a chord…</span>
        ) : (
          <kbd className="keybinds-list__combo">{hotkey || 'Not set'}</kbd>
        )}
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => setRecording(true)}
          disabled={recording}
        >
          {recording ? 'Recording…' : 'Record'}
        </button>
        {hotkey ? (
          <button type="button" className="btn btn--sm btn--ghost" onClick={handleClear}>
            Clear
          </button>
        ) : null}
      </div>
      {error ? <p className="keybinds-list__error" role="alert">{error}</p> : null}
    </div>
  );
}

function VaultPanel() {
  return (
    <div className="options-menu__section">
      <span className="options-menu__label">🔐 SSH Vault</span>
      <p className="options-menu__hint">
        Store SSH connections with credentials. All data is stored locally.
      </p>
      <VaultListWrapper />
    </div>
  );
}

function VaultListWrapper() {
  const [VaultListComponent, setVaultListComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import('@/components/vault/VaultList').then((mod) => {
      setVaultListComponent(() => mod.VaultList);
    });
  }, []);

  if (!VaultListComponent) return <p>Loading vault...</p>;
  return <VaultListComponent />;
}
