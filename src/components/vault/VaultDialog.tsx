import { useEffect, useState, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * Vault Entry type matching Rust backend.
 */
export type VaultEntry = {
  id: string;
  label: string;
  groupName?: string;
  tags: string[];
  host: string;
  port: number;
  username: string;
  authType: { type: 'key'; data: { path: string } } | { type: 'password'; data: { password: string } };
  agentForwarding: boolean;
  startupCommand?: string;
  proxy?: string;
  themeColor?: string;
  createdAt: string;
  updatedAt: string;
};

export type VaultEntryInput = {
  label: string;
  groupName?: string;
  tags: string[];
  host: string;
  port: number;
  username: string;
  authType: { type: 'key'; data: { path: string } } | { type: 'password'; data: { password: string } };
  agentForwarding: boolean;
  startupCommand?: string;
  proxy?: string;
  themeColor?: string;
};

type VaultDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (entry: VaultEntryInput) => void;
  editEntry?: VaultEntry | null;
};

const THEME_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

/**
 * Vault dialog for creating/editing SSH connection entries.
 * Appears as a popup in the middle of the screen without blocking running processes.
 */
export function VaultDialog({ open, onClose, onSave, editEntry }: VaultDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { onClose });

  const [label, setLabel] = useState('');
  const [groupName, setGroupName] = useState('');
  const [tags, setTags] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState<'password' | 'key'>('password');
  const [password, setPassword] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [agentForwarding, setAgentForwarding] = useState(false);
  const [startupCommand, setStartupCommand] = useState('');
  const [proxy, setProxy] = useState('');
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editEntry) {
        setLabel(editEntry.label);
        setGroupName(editEntry.groupName || '');
        setTags(editEntry.tags.join(', '));
        setHost(editEntry.host);
        setPort(String(editEntry.port));
        setUsername(editEntry.username);
        setAuthMode(editEntry.authType.type);
        if (editEntry.authType.type === 'password') setPassword(editEntry.authType.data.password);
        if (editEntry.authType.type === 'key') setKeyPath(editEntry.authType.data.path);
        setAgentForwarding(editEntry.agentForwarding);
        setStartupCommand(editEntry.startupCommand || '');
        setProxy(editEntry.proxy || '');
        setThemeColor(editEntry.themeColor || THEME_COLORS[0]);
      } else {
        setLabel('');
        setGroupName('');
        setTags('');
        setHost('');
        setPort('22');
        setUsername('');
        setAuthMode('password');
        setPassword('');
        setKeyPath('');
        setAgentForwarding(false);
        setStartupCommand('');
        setProxy('');
        setThemeColor(THEME_COLORS[0]);
      }
      setError(null);
    }
  }, [open, editEntry]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!label.trim()) { setError('Label is required'); return; }
    if (!host.trim()) { setError('Host is required'); return; }
    if (!username.trim()) { setError('Username is required'); return; }
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { setError('Port must be 1-65535'); return; }
    if (authMode === 'password' && !password) { setError('Password is required'); return; }
    if (authMode === 'key' && !keyPath.trim()) { setError('SSH key path is required'); return; }

    const input: VaultEntryInput = {
      label: label.trim(),
      groupName: groupName.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      host: host.trim(),
      port: portNum,
      username: username.trim(),
      authType: authMode === 'password'
        ? { type: 'password', data: { password } }
        : { type: 'key', data: { path: keyPath.trim() } },
      agentForwarding,
      startupCommand: startupCommand.trim() || undefined,
      proxy: proxy.trim() || undefined,
      themeColor,
    };

    onSave(input);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="vault-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={editEntry ? 'Edit connection' : 'New connection'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vault-dialog__header">
          <h2 className="vault-dialog__title">
            {editEntry ? 'Edit Connection' : 'New Connection'}
          </h2>
          <button type="button" className="vault-dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="vault-dialog__form">
          {/* Identity */}
          <div className="vault-dialog__section">
            <h3 className="vault-dialog__section-title">Identity</h3>
            <div className="vault-dialog__grid">
              <div className="vault-dialog__field">
                <label htmlFor="vault-label" className="vault-dialog__label">Label *</label>
                <input id="vault-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="Production Server" className="vault-dialog__input" required />
              </div>
              <div className="vault-dialog__field">
                <label htmlFor="vault-group" className="vault-dialog__label">Group</label>
                <input id="vault-group" type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Production" className="vault-dialog__input" />
              </div>
              <div className="vault-dialog__field vault-dialog__field--full">
                <label htmlFor="vault-tags" className="vault-dialog__label">Tags</label>
                <input id="vault-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="web, nginx, api (comma separated)" className="vault-dialog__input" />
              </div>
            </div>
          </div>

          {/* Connection */}
          <div className="vault-dialog__section">
            <h3 className="vault-dialog__section-title">Connection</h3>
            <div className="vault-dialog__grid">
              <div className="vault-dialog__field vault-dialog__field--wide">
                <label htmlFor="vault-host" className="vault-dialog__label">Host / IP *</label>
                <input id="vault-host" type="text" value={host} onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.100" className="vault-dialog__input" required />
              </div>
              <div className="vault-dialog__field vault-dialog__field--narrow">
                <label htmlFor="vault-port" className="vault-dialog__label">Port *</label>
                <input id="vault-port" type="number" value={port} onChange={(e) => setPort(e.target.value)}
                  min={1} max={65535} className="vault-dialog__input" required />
              </div>
              <div className="vault-dialog__field">
                <label htmlFor="vault-username" className="vault-dialog__label">Username *</label>
                <input id="vault-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="root" className="vault-dialog__input" required />
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="vault-dialog__section">
            <h3 className="vault-dialog__section-title">Authentication *</h3>
            <div className="vault-dialog__auth-toggle">
              <button type="button"
                className={`vault-dialog__auth-btn${authMode === 'password' ? ' vault-dialog__auth-btn--active' : ''}`}
                onClick={() => setAuthMode('password')}>
                🔑 Password
              </button>
              <button type="button"
                className={`vault-dialog__auth-btn${authMode === 'key' ? ' vault-dialog__auth-btn--active' : ''}`}
                onClick={() => setAuthMode('key')}>
                📄 SSH Key
              </button>
            </div>
            {authMode === 'password' ? (
              <div className="vault-dialog__field">
                <label htmlFor="vault-password" className="vault-dialog__label">Password</label>
                <input id="vault-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="vault-dialog__input" />
              </div>
            ) : (
              <div className="vault-dialog__field">
                <label htmlFor="vault-keypath" className="vault-dialog__label">SSH Key Path</label>
                <input id="vault-keypath" type="text" value={keyPath} onChange={(e) => setKeyPath(e.target.value)}
                  placeholder="~/.ssh/id_rsa" className="vault-dialog__input" />
              </div>
            )}
          </div>

          {/* Options */}
          <div className="vault-dialog__section">
            <h3 className="vault-dialog__section-title">Options</h3>
            <div className="vault-dialog__grid">
              <div className="vault-dialog__field">
                <label htmlFor="vault-startup" className="vault-dialog__label">Startup Command</label>
                <input id="vault-startup" type="text" value={startupCommand} onChange={(e) => setStartupCommand(e.target.value)}
                  placeholder="htop" className="vault-dialog__input" />
              </div>
              <div className="vault-dialog__field">
                <label htmlFor="vault-proxy" className="vault-dialog__label">Proxy</label>
                <input id="vault-proxy" type="text" value={proxy} onChange={(e) => setProxy(e.target.value)}
                  placeholder="user@proxy-host:22" className="vault-dialog__input" />
              </div>
              <div className="vault-dialog__field vault-dialog__field--full">
                <label className="vault-dialog__label">
                  <input type="checkbox" checked={agentForwarding} onChange={(e) => setAgentForwarding(e.target.checked)} />
                  Agent Forwarding
                </label>
              </div>
            </div>
          </div>

          {/* Theme Color */}
          <div className="vault-dialog__section">
            <h3 className="vault-dialog__section-title">Button Color</h3>
            <div className="vault-dialog__colors">
              {THEME_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`vault-dialog__color${themeColor === color ? ' vault-dialog__color--active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setThemeColor(color)}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          {error ? <p className="vault-dialog__error" role="alert">{error}</p> : null}

          <div className="vault-dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary">
              {editEntry ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
