import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  isTauriRuntime,
  stateExportConfig,
  stateImportConfig,
  stateSaveSnapshot,
  systemRegisterGlobalHotkey,
  templatesList,
  templatesMaterialize,
} from '@/lib/tauri';
import { AISettingsPanel } from '@/components/shell/AISettingsPanel';
import { BroadcastPanel } from '@/components/shell/BroadcastPanel';
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
  type CursorStyle,
  type SshConnection,
} from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUiStore } from '@/stores/uiStore';
import { getKeybindRegistry } from '@/lib/keybindBootstrap';
import type { ExportPayload, WorkspaceTemplate } from '@/types';

// ─── Section definitions ──────────────────────────────────────────────

type SettingsSection =
  | 'appearance'
  | 'terminal'
  | 'ai'
  | 'ssh'
  | 'broadcast'
  | 'keybinds'
  | 'templates'
  | 'snippets'
  | 'config'
  | 'worktree'
  | 'about';

const SECTIONS: { id: SettingsSection; label: string; icon: string; description: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: '🎨', description: 'Theme, fonts, colors' },
  { id: 'terminal', label: 'Terminal', icon: '⌨', description: 'Shell, cursor, behavior' },
  { id: 'ai', label: 'AI', icon: '🤖', description: 'Provider, model, API keys' },
  { id: 'ssh', label: 'SSH', icon: '🔑', description: 'Connections & keys' },
  { id: 'broadcast', label: 'Broadcast', icon: '📡', description: 'Multi-pane commands' },
  { id: 'keybinds', label: 'Keybinds', icon: '⌘', description: 'Keyboard shortcuts' },
  { id: 'templates', label: 'Templates', icon: '📋', description: 'Workspace presets' },
  { id: 'snippets', label: 'Snippets', icon: '📝', description: 'Command library' },
  { id: 'config', label: 'Config', icon: '⚙', description: 'Backup, hotkey, restart' },
  { id: 'worktree', label: 'Git', icon: '🌿', description: 'Worktrees & branches' },
  { id: 'about', label: 'About', icon: 'ℹ', description: 'Version & diagnostics' },
];

const FONT_CHOICES = [
  { value: 'Cascadia Code, ui-monospace, monospace', label: 'Cascadia Code' },
  { value: 'JetBrains Mono, ui-monospace, monospace', label: 'JetBrains Mono' },
  { value: 'Fira Code, ui-monospace, monospace', label: 'Fira Code' },
  { value: 'ui-monospace, SFMono-Regular, monospace', label: 'System mono' },
];

// ─── Reusable card wrapper ────────────────────────────────────────────

function SettingsCard({
  title,
  description,
  icon,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`settings-card ${className}`}>
      <div className="settings-card__header">
        {icon ? <span className="settings-card__icon">{icon}</span> : null}
        <div>
          <h3 className="settings-card__title">{title}</h3>
          {description ? <p className="settings-card__desc">{description}</p> : null}
        </div>
      </div>
      <div className="settings-card__body">{children}</div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="settings-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settings-toggle__track">
        <span className="settings-toggle__thumb" />
      </span>
      {label ? <span className="settings-toggle__label">{label}</span> : null}
    </label>
  );
}

// ─── Theme card ───────────────────────────────────────────────────────

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

// ─── SSH Panel ────────────────────────────────────────────────────────

function SSHPanel() {
  const connections = useSettingsStore((s) => s.sshConnections);
  const addConnection = useSettingsStore((s) => s.addSshConnection);
  const removeConnection = useSettingsStore((s) => s.removeSshConnection);
  const updateConnection = useSettingsStore((s) => s.updateSshConnection);
  const [editing, setEditing] = useState<SshConnection | null>(null);
  const [adding, setAdding] = useState(false);

  const emptyForm: Omit<SshConnection, 'id'> = {
    name: '',
    host: '',
    port: 22,
    user: 'root',
    keyPath: '',
    agentForwarding: false,
  };
  const [form, setForm] = useState(emptyForm);

  const startAdd = () => {
    setForm(emptyForm);
    setAdding(true);
    setEditing(null);
  };

  const startEdit = (conn: SshConnection) => {
    setForm({ name: conn.name, host: conn.host, port: conn.port, user: conn.user, keyPath: conn.keyPath ?? '', agentForwarding: conn.agentForwarding });
    setEditing(conn);
    setAdding(false);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.host.trim()) return;
    if (editing) {
      updateConnection(editing.id, form);
    } else {
      addConnection(form);
    }
    setAdding(false);
    setEditing(null);
  };

  const handleCancel = () => {
    setAdding(false);
    setEditing(null);
  };

  const showForm = adding || editing !== null;

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <span className="settings-card__icon">🔑</span>
        <div>
          <h3 className="settings-card__title">SSH Connections</h3>
          <p className="settings-card__desc">Manage remote server connections. Quick-connect opens a terminal with SSH.</p>
        </div>
      </div>
      <div className="settings-card__body">
        {connections.length === 0 && !showForm ? (
          <p className="settings-empty">No SSH connections saved.</p>
        ) : (
          <div className="settings-list">
            {connections.map((conn) => (
              <div key={conn.id} className="settings-list__item">
                <div className="settings-list__info">
                  <span className="settings-list__name">{conn.name}</span>
                  <code className="settings-list__code">{conn.user}@{conn.host}:{conn.port}</code>
                </div>
                <div className="settings-list__actions">
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => startEdit(conn)} title="Edit">✎</button>
                  <button type="button" className="btn btn--sm btn--ghost btn--danger" onClick={() => removeConnection(conn.id)} title="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <div className="settings-form">
            <div className="settings-form-row">
              <label className="settings-field">
                <span className="settings-label">Name</span>
                <input type="text" className="settings-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Server" />
              </label>
              <label className="settings-field">
                <span className="settings-label">Host</span>
                <input type="text" className="settings-input" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.100" />
              </label>
            </div>
            <div className="settings-form-row">
              <label className="settings-field">
                <span className="settings-label">User</span>
                <input type="text" className="settings-input" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="root" />
              </label>
              <label className="settings-field">
                <span className="settings-label">Port</span>
                <input type="number" className="settings-input settings-input--narrow" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} min={1} max={65535} />
              </label>
            </div>
            <label className="settings-field">
              <span className="settings-label">SSH Key Path (optional)</span>
              <input type="text" className="settings-input" value={form.keyPath ?? ''} onChange={(e) => setForm({ ...form, keyPath: e.target.value })} placeholder="~/.ssh/id_ed25519" />
            </label>
            <Toggle checked={form.agentForwarding} onChange={(v) => setForm({ ...form, agentForwarding: v })} label="Agent forwarding" />
            <div className="settings-form-row" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn btn--primary btn--sm" onClick={handleSave}>
                {editing ? 'Save' : 'Add'}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn--sm btn--primary" onClick={startAdd} style={{ marginTop: '0.5rem' }}>
            + Add connection
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Snippets Panel ───────────────────────────────────────────────────

function SnippetsPanel() {
  const snippets = useSettingsStore((s) => s.snippets);
  const addSnippet = useSettingsStore((s) => s.addSnippet);
  const removeSnippet = useSettingsStore((s) => s.removeSnippet);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !command.trim()) return;
    addSnippet(name.trim(), command.trim());
    setName('');
    setCommand('');
  };

  return (
    <SettingsCard title="Snippet Library" icon="📝" description="Save frequently-used commands for quick access.">
      {snippets.length === 0 ? (
        <p className="settings-empty">No snippets saved yet.</p>
      ) : (
        <div className="settings-list">
          {snippets.map((snippet, i) => (
            <div key={i} className="settings-list__item">
              <div className="settings-list__info">
                <span className="settings-list__name">{snippet.name}</span>
                <code className="settings-list__code">{snippet.command}</code>
              </div>
              <button type="button" className="btn btn--sm btn--ghost btn--danger" onClick={() => removeSnippet(i)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="settings-form-row" style={{ marginTop: '0.5rem' }}>
        <input type="text" className="settings-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" className="settings-input settings-input--grow" placeholder="Command" value={command} onChange={(e) => setCommand(e.target.value)} />
        <button type="button" className="btn btn--primary btn--sm" onClick={handleAdd} disabled={!name.trim() || !command.trim()}>Add</button>
      </div>
    </SettingsCard>
  );
}

// ─── Keybinds Panel ───────────────────────────────────────────────────

function KeybindsPanel() {
  const overrides = useSettingsStore((s) => s.keybindOverrides);
  const setOverride = useSettingsStore((s) => s.setKeybindOverride);
  const resetKeybinds = useSettingsStore((s) => s.resetKeybinds);
  const registry = getKeybindRegistry();
  const allBindings = registry.list();
  const entries: Array<[string, { combo: import('@/lib/keybind').Combo; description: string }]> = allBindings.map((b) => [b.id, b]);
  const [recording, setRecording] = useState<KeybindId | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const combo = comboFromEvent(e);
      if (combo) {
        setOverride(recording, combo);
        setRecording(null);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recording, setOverride]);

  const filtered = search
    ? entries.filter(([, b]) => b.description.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <SettingsCard title="Keyboard Shortcuts" icon="⌘" description="Click Rebind to change a shortcut. Press Escape to cancel.">
      <input
        type="text"
        className="settings-input"
        placeholder="Search shortcuts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '0.75rem', maxWidth: '100%' }}
      />
      <div className="settings-list">
        {filtered.map(([id, binding]) => {
          const current = overrides[id] ?? binding.combo;
          return (
            <div key={id} className="settings-list__item">
              <span className="settings-list__name">{binding.description}</span>
              <div className="settings-list__actions">
                <kbd className="settings-kbd">{comboLabel(current)}</kbd>
                <button
                  type="button"
                  className={`btn btn--sm ${recording === id ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setRecording(recording === id ? null : id)}
                >
                  {recording === id ? 'Press...' : 'Rebind'}
                </button>
                {overrides[id] && !combosEqual(overrides[id], binding.combo) ? (
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOverride(id, null)} title="Reset to default">↺</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={resetKeybinds} style={{ marginTop: '0.75rem' }}>Reset all to defaults</button>
    </SettingsCard>
  );
}

// ─── Templates Panel ──────────────────────────────────────────────────

function TemplatesPanel() {
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    templatesList()
      .then((list) => { if (!cancelled) { setTemplates(list); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleUse = async (template: WorkspaceTemplate) => {
    setMessage(null);
    setError(null);
    setPendingId(template.id);
    try {
      const result = await templatesMaterialize(template.id, template.label);
      createWorkspace(result.name, result.accentColor, '');
      setMessage(`Created "${result.name}" from template.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create from template');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <SettingsCard title="Workspace Templates" icon="📋" description="Spin up a pre-configured workspace with one click.">
      {message ? <p className="settings-msg settings-msg--ok">{message}</p> : null}
      {error ? <p className="settings-msg settings-msg--err">{error}</p> : null}
      {loading ? (
        <p className="settings-empty">Loading templates...</p>
      ) : templates.length === 0 ? (
        <p className="settings-empty">No templates available.</p>
      ) : (
        <div className="settings-grid">
          {templates.map((t) => (
            <div key={t.id} className="settings-card settings-card--mini">
              <div className="settings-card__header">
                <span className="settings-card__swatch" style={{ background: t.accentColor }} />
                <span className="settings-card__title">{t.label}</span>
                <span className="settings-card__meta">{t.panes.length} pane{t.panes.length > 1 ? 's' : ''}</span>
              </div>
              <p className="settings-card__desc">{t.description}</p>
              <button type="button" className="btn btn--primary btn--sm" data-testid={`template-use-${t.id}`} onClick={() => void handleUse(t)} disabled={pendingId === t.id}>
                {pendingId === t.id ? 'Creating...' : 'Use template'}
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}

// ─── Section renderers ────────────────────────────────────────────────

function AppearanceSection() {
  const themeId = useSettingsStore((s) => s.themeId);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const customThemeCSS = useSettingsStore((s) => s.customThemeCSS);
  const setThemeId = useSettingsStore((s) => s.setThemeId);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setCustomThemeCSS = useSettingsStore((s) => s.setCustomThemeCSS);

  return (
    <div className="settings-section-grid">
      <SettingsCard title="Theme" icon="🎨" description="Choose a color theme for the entire app.">
        <div className="theme-grid" role="radiogroup">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => (
            <ThemeCard key={id} themeId={id} active={themeId === id} onClick={() => setThemeId(id)} />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Mode" icon="🌗" description="Switch between light and dark appearance.">
        <div className="settings-btn-group">
          <button type="button" className={`settings-btn ${themeMode === 'light' ? 'settings-btn--active' : ''}`} onClick={() => setThemeMode('light')}>☀ Light</button>
          <button type="button" className={`settings-btn ${themeMode === 'dark' ? 'settings-btn--active' : ''}`} onClick={() => setThemeMode('dark')}>☾ Dark</button>
        </div>
      </SettingsCard>

      <SettingsCard title="Font" icon="🔤" description="Terminal font family and size.">
        <div className="settings-form-row">
          <select className="settings-select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
            {FONT_CHOICES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <label className="settings-field">
            <span className="settings-label">Size</span>
            <input type="number" className="settings-input settings-input--narrow" min={10} max={22} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
          </label>
        </div>
      </SettingsCard>

      <SettingsCard title="Custom CSS" icon="✏" description="Override theme variables with custom CSS.">
        <textarea className="settings-textarea" rows={4} value={customThemeCSS} onChange={(e) => setCustomThemeCSS(e.target.value)} placeholder="--tw-accent: #ff6b6b;" />
      </SettingsCard>
    </div>
  );
}

function TerminalSection() {
  const terminalScrollback = useSettingsStore((s) => s.terminalScrollback);
  const terminalBell = useSettingsStore((s) => s.terminalBell);
  const terminalCopyOnSelect = useSettingsStore((s) => s.terminalCopyOnSelect);
  const passthroughByDefault = useSettingsStore((s) => s.passthroughByDefault);
  const autoRestart = useSettingsStore((s) => s.autoRestart);
  const terminalCursorStyle = useSettingsStore((s) => s.terminalCursorStyle);
  const terminalCursorBlink = useSettingsStore((s) => s.terminalCursorBlink);
  const terminalFontLigatures = useSettingsStore((s) => s.terminalFontLigatures);
  const terminalLineHeight = useSettingsStore((s) => s.terminalLineHeight);
  const terminalPadding = useSettingsStore((s) => s.terminalPadding);
  const notificationSound = useSettingsStore((s) => s.notificationSound);
  const notificationDesktop = useSettingsStore((s) => s.notificationDesktop);
  const terminalGpuAcceleration = useSettingsStore((s) => s.terminalGpuAcceleration);
  const terminalMaxRenderRate = useSettingsStore((s) => s.terminalMaxRenderRate);

  const setTerminalScrollback = useSettingsStore((s) => s.setTerminalScrollback);
  const setTerminalBell = useSettingsStore((s) => s.setTerminalBell);
  const setTerminalCopyOnSelect = useSettingsStore((s) => s.setTerminalCopyOnSelect);
  const setPassthroughByDefault = useSettingsStore((s) => s.setPassthroughByDefault);
  const setAutoRestart = useSettingsStore((s) => s.setAutoRestart);
  const setTerminalCursorStyle = useSettingsStore((s) => s.setTerminalCursorStyle);
  const setTerminalCursorBlink = useSettingsStore((s) => s.setTerminalCursorBlink);
  const setTerminalFontLigatures = useSettingsStore((s) => s.setTerminalFontLigatures);
  const setTerminalLineHeight = useSettingsStore((s) => s.setTerminalLineHeight);
  const setTerminalPadding = useSettingsStore((s) => s.setTerminalPadding);
  const setNotificationSound = useSettingsStore((s) => s.setNotificationSound);
  const setNotificationDesktop = useSettingsStore((s) => s.setNotificationDesktop);
  const setTerminalGpuAcceleration = useSettingsStore((s) => s.setTerminalGpuAcceleration);
  const setTerminalMaxRenderRate = useSettingsStore((s) => s.setTerminalMaxRenderRate);

  return (
    <div className="settings-section-grid">
      <SettingsCard title="Cursor" icon="▎" description="Terminal cursor appearance.">
        <div className="settings-btn-group">
          {(['block', 'underline', 'bar'] as CursorStyle[]).map((style) => (
            <button key={style} type="button" className={`settings-btn ${terminalCursorStyle === style ? 'settings-btn--active' : ''}`} onClick={() => setTerminalCursorStyle(style)}>
              {style === 'block' ? '▮' : style === 'underline' ? '▁' : '▎'} {style}
            </button>
          ))}
        </div>
        <Toggle checked={terminalCursorBlink} onChange={setTerminalCursorBlink} label="Cursor blink" />
      </SettingsCard>

      <SettingsCard title="Behavior" icon="⚙" description="Terminal interaction settings.">
        <Toggle checked={passthroughByDefault} onChange={setPassthroughByDefault} label="Passthrough by default" />
        <Toggle checked={terminalCopyOnSelect} onChange={setTerminalCopyOnSelect} label="Copy on select" />
        <label className="settings-field" style={{ marginTop: '0.5rem' }}>
          <span className="settings-label">Bell</span>
          <select className="settings-select" value={terminalBell} onChange={(e) => setTerminalBell(e.target.value as 'none' | 'visual' | 'sound')}>
            <option value="none">None</option>
            <option value="visual">Visual flash</option>
            <option value="sound">Sound</option>
          </select>
        </label>
        <label className="settings-field">
          <span className="settings-label">Scrollback buffer</span>
          <input type="number" className="settings-input" min={100} max={100000} step={100} value={terminalScrollback} onChange={(e) => setTerminalScrollback(Number(e.target.value))} />
        </label>
      </SettingsCard>

      <SettingsCard title="Typography" icon="🅰" description="Font rendering in terminal.">
        <Toggle checked={terminalFontLigatures} onChange={setTerminalFontLigatures} label="Font ligatures" />
        <label className="settings-field">
          <span className="settings-label">Line height</span>
          <input type="number" className="settings-input settings-input--narrow" min={1.0} max={2.0} step={0.1} value={terminalLineHeight} onChange={(e) => setTerminalLineHeight(Number(e.target.value))} />
        </label>
        <label className="settings-field">
          <span className="settings-label">Padding (px)</span>
          <input type="number" className="settings-input settings-input--narrow" min={0} max={20} value={terminalPadding} onChange={(e) => setTerminalPadding(Number(e.target.value))} />
        </label>
      </SettingsCard>

      <SettingsCard title="Auto-Restart" icon="🔄" description="Restart terminal on crash.">
        <Toggle checked={autoRestart.enabled} onChange={(v) => setAutoRestart({ enabled: v })} label="Enable auto-restart" />
        {autoRestart.enabled ? (
          <div className="settings-form-row" style={{ marginTop: '0.5rem' }}>
            <label className="settings-field">
              <span className="settings-label">Max attempts</span>
              <input type="number" className="settings-input settings-input--narrow" min={1} max={10} value={autoRestart.maxAttempts} onChange={(e) => setAutoRestart({ maxAttempts: Number(e.target.value) })} />
            </label>
            <label className="settings-field">
              <span className="settings-label">Backoff (ms)</span>
              <input type="number" className="settings-input settings-input--narrow" min={500} max={30000} step={500} value={autoRestart.backoffMs} onChange={(e) => setAutoRestart({ backoffMs: Number(e.target.value) })} />
            </label>
          </div>
        ) : null}
      </SettingsCard>

      <SettingsCard title="Notifications" icon="🔔" description="Alert preferences.">
        <Toggle checked={notificationSound} onChange={setNotificationSound} label="Sound notifications" />
        <Toggle checked={notificationDesktop} onChange={setNotificationDesktop} label="Desktop notifications" />
      </SettingsCard>

      <SettingsCard title="Performance" icon="⚡" description="Rendering performance tuning.">
        <Toggle checked={terminalGpuAcceleration} onChange={setTerminalGpuAcceleration} label="GPU acceleration (WebGL)" />
        <label className="settings-field">
          <span className="settings-label">Max render rate (FPS)</span>
          <input type="number" className="settings-input settings-input--narrow" min={15} max={120} value={terminalMaxRenderRate} onChange={(e) => setTerminalMaxRenderRate(Number(e.target.value))} />
        </label>
      </SettingsCard>
    </div>
  );
}

function ConfigSection() {
  const globalHotkey = useSettingsStore((s) => s.globalHotkey);
  const setGlobalHotkey = useSettingsStore((s) => s.setGlobalHotkey);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const json = await stateExportConfig();
      const blob = new Blob([json as unknown as string], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nonaterm-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'success', text: 'Config exported.' });
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Export failed' });
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await stateImportConfig(text);
      const payload = JSON.parse(text) as ExportPayload;
      useWorkspaceStore.getState().hydrateFromSnapshot(payload.activeWorkspaceId, payload.workspaces);
      setStatus({ kind: 'success', text: `Imported ${count} workspace(s).` });
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Import failed' });
    }
    e.target.value = '';
  };

  const handleSnapshot = async () => {
    try {
      const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
      await stateSaveSnapshot({ activeWorkspaceId, workspaces, savedAt: new Date().toISOString() });
      setStatus({ kind: 'success', text: 'Snapshot saved.' });
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Snapshot failed' });
    }
  };

  return (
    <div className="settings-section-grid">
      <SettingsCard title="Global Hotkey" icon="⌨" description="System-wide shortcut to show/hide Nonaterm.">
        <div className="settings-form-row">
          <input type="text" className="settings-input" aria-label="Global hotkey" value={globalHotkey} onChange={(e) => setGlobalHotkey(e.target.value)} placeholder="e.g. Ctrl+Shift+`" />
          {isTauriRuntime() ? (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => void systemRegisterGlobalHotkey(globalHotkey)}>Register</button>
          ) : null}
        </div>
      </SettingsCard>

      <SettingsCard title="Backup & Restore" icon="💾" description="Export, import, or snapshot your config.">
        <div className="settings-form-row">
          <button type="button" className="btn btn--sm" onClick={() => void handleExport()}>Export</button>
          <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
            Import
            <input type="file" accept="application/json,.json" onChange={(e) => void handleImport(e)} style={{ display: 'none' }} />
          </label>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => void handleSnapshot()}>Save snapshot</button>
        </div>
        {status ? <p className={`settings-msg settings-msg--${status.kind}`} style={{ marginTop: '0.5rem' }}>{status.text}</p> : null}
      </SettingsCard>
    </div>
  );
}

function AboutSection() {
  const appInfo = useUiStore((s) => s.appInfo);
  const diagnostics = useUiStore((s) => s.diagnostics);
  const backendStatus = useUiStore((s) => s.backendStatus);

  return (
    <div className="settings-section-grid">
      <SettingsCard title="About Nonaterm" icon="ℹ" description="Version and platform information.">
        <dl className="settings-meta">
          <div><dt>App</dt><dd>{appInfo ? `${appInfo.name} v${appInfo.version}` : 'Nonaterm'}</dd></div>
          <div><dt>Platform</dt><dd>{appInfo?.platform ?? '—'}</dd></div>
          <div><dt>Backend</dt><dd>{backendStatus}</dd></div>
          <div><dt>Log directory</dt><dd>{diagnostics?.logDir ?? '—'}</dd></div>
        </dl>
      </SettingsCard>

      <SettingsCard title="Developer Tools" icon="🛠" description="Toggle diagnostics bar with log file and crash report count.">
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => window.dispatchEvent(new CustomEvent('Nonaterm:toggle-diagnostics'))}
        >
          Toggle Diagnostics Bar
        </button>
      </SettingsCard>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────

export function SettingsPage() {
  const optionsOpen = useSettingsStore((s) => s.optionsOpen);
  const setOptionsOpen = useSettingsStore((s) => s.setOptionsOpen);
  const [section, setSection] = useState<SettingsSection>('appearance');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOptionsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [optionsOpen, setOptionsOpen]);

  if (!optionsOpen) return null;

  const renderSection = () => {
    switch (section) {
      case 'appearance':
        return <AppearanceSection />;
      case 'terminal':
        return <TerminalSection />;
      case 'ai':
        return (
          <div className="settings-section-grid">
            <SettingsCard title="AI Configuration" icon="🤖" description="Configure AI provider, model, and API keys.">
              <AISettingsPanel />
            </SettingsCard>
          </div>
        );
      case 'ssh':
        return (
          <div className="settings-section-grid">
            <SSHPanel />
          </div>
        );
      case 'broadcast':
        return (
          <div className="settings-section-grid">
            <SettingsCard title="Broadcast Input" icon="📡" description="Send one command to multiple terminals simultaneously.">
              <BroadcastPanel workspaceId={useWorkspaceStore.getState().activeWorkspaceId} />
            </SettingsCard>
          </div>
        );
      case 'keybinds':
        return (
          <div className="settings-section-grid">
            <KeybindsPanel />
          </div>
        );
      case 'templates':
        return (
          <div className="settings-section-grid">
            <TemplatesPanel />
          </div>
        );
      case 'snippets':
        return (
          <div className="settings-section-grid">
            <SnippetsPanel />
          </div>
        );
      case 'config':
        return <ConfigSection />;
      case 'worktree':
        return (
          <div className="settings-section-grid">
            <SettingsCard title="Git Worktrees" icon="🌿" description="Manage git worktrees for parallel development.">
              <WorktreePanel cwd={undefined} />
            </SettingsCard>
          </div>
        );
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <div className="settings-page" role="dialog" aria-label="Settings" ref={panelRef}>
      <header className="settings-header">
        <div className="settings-header__left">
          <h2 className="settings-header__title">Settings</h2>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOptionsOpen(false)} aria-label="Close settings">
          ✕
        </button>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              className={`settings-nav__item${section === s.id ? ' settings-nav__item--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span className="settings-nav__icon">{s.icon}</span>
              <div className="settings-nav__text">
                <span className="settings-nav__label">{s.label}</span>
                <span className="settings-nav__desc">{s.description}</span>
              </div>
            </button>
          ))}
        </nav>

        <main className="settings-content">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
