import { useRef, useState, useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FolderPicker } from './FolderPicker';
import { ColorPicker } from './ColorPicker';
import { SHELL_PRESETS, TOOL_PRESETS, type ShellPresetId } from './toolPresets';

type TerminalConfigModalProps = {
  onAddPane?: (shell: string, cwd: string) => void;
  onAddBatch?: (count: number, shell: string, cwd: string) => void;
};

/**
 * Modal dialog for configuring and adding terminal panes to a workspace.
 * If no workspace is active, offers to create one first.
 */
export function TerminalConfigModal({
  onAddPane,
  onAddBatch,
}: TerminalConfigModalProps) {
  const {
    terminalConfigModalOpen: open,
    closeTerminalConfigModal: close,
  } = useUiStore();
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((w) => w.id === state.activeWorkspaceId),
  );
  const addPaneToWorkspace = useWorkspaceStore(
    (state) => state.addPaneToWorkspace,
  );
  const addPanesBatch = useWorkspaceStore((state) => state.addPanesBatch);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);

  const [shellPreset, setShellPreset] = useState<ShellPresetId>('powershell');
  const [customShell, setCustomShell] = useState('');
  const [cwd, setCwd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New workspace fields (only shown when no active workspace)
  const [wsName, setWsName] = useState('');
  const [wsColor, setWsColor] = useState('#7c3aed');

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const shellInputRef = useRef<HTMLSelectElement | null>(null);

  useFocusTrap(dialogRef, open);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setShellPreset('powershell');
      setCustomShell('');
      setCwd('');
      setError(null);
      setIsSubmitting(false);
      setWsName('');
      setWsColor('#7c3aed');
      // Auto-focus shell select
      const t = setTimeout(() => shellInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const needsWorkspace = !activeWorkspace;

  const resolveShell = (): string | undefined => {
    const preset = SHELL_PRESETS.find((s) => s.id === shellPreset);
    if (!preset) {
      return undefined;
    }
    if (shellPreset === 'custom') {
      return customShell.trim() || undefined;
    }
    return preset.command || undefined;
  };

  const handleAddPane = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      let workspaceId = activeWorkspace?.id;

      // Create workspace first if needed
      if (needsWorkspace) {
        if (!wsName.trim()) {
          setError('Workspace name is required');
          setIsSubmitting(false);
          return;
        }
        createWorkspace(wsName.trim(), wsColor, cwd.trim() || undefined);
        // Read back the workspace that was just created (last in list)
        const updatedWorkspaces = useWorkspaceStore.getState().workspaces;
        workspaceId = updatedWorkspaces[updatedWorkspaces.length - 1]?.id;
      }

      if (!workspaceId) {
        setError('No active workspace');
        setIsSubmitting(false);
        return;
      }

      const workspace = useWorkspaceStore
        .getState()
        .workspaces.find((w) => w.id === workspaceId);

      if (!workspace) {
        setError('Workspace not found');
        setIsSubmitting(false);
        return;
      }

      if (workspace.panes.length >= 9) {
        setError('Maximum 9 terminals per workspace');
        setIsSubmitting(false);
        return;
      }

      const shell = resolveShell();
      const title =
        SHELL_PRESETS.find((s) => s.id === shellPreset)?.name || 'Terminal';

      const pane = {
        id: `${workspace.id}-pane-${Date.now()}-0-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        title,
        cwd: needsWorkspace ? '' : cwd.trim(),
        startupCommand: '',
        shell,
      };

      addPaneToWorkspace(workspace.id, pane);

      if (onAddPane) {
        onAddPane(shell || '', cwd.trim());
      }

      close();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add terminal',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBatch = async (count: 1 | 2) => {
    setError(null);
    setIsSubmitting(true);

    try {
      let workspaceId = activeWorkspace?.id;

      // Create workspace first if needed
      if (needsWorkspace) {
        if (!wsName.trim()) {
          setError('Workspace name is required');
          setIsSubmitting(false);
          return;
        }
        createWorkspace(wsName.trim(), wsColor, cwd.trim() || undefined);
        // Read back the workspace that was just created (last in list)
        const updatedWorkspaces = useWorkspaceStore.getState().workspaces;
        workspaceId = updatedWorkspaces[updatedWorkspaces.length - 1]?.id;
      }

      if (!workspaceId) {
        setError('No active workspace');
        setIsSubmitting(false);
        return;
      }

      const workspace = useWorkspaceStore
        .getState()
        .workspaces.find((w) => w.id === workspaceId);

      if (!workspace) {
        setError('Workspace not found');
        setIsSubmitting(false);
        return;
      }

      const room = 9 - workspace.panes.length;
      if (room <= 0) {
        setError('Maximum 9 terminals per workspace');
        setIsSubmitting(false);
        return;
      }

      const take = Math.min(count, room);
      const shell = resolveShell();
      const title =
        SHELL_PRESETS.find((s) => s.id === shellPreset)?.name || 'Terminal';

      const batch = Array.from({ length: take }, (_, i) => ({
        id: `${workspace.id}-pane-${Date.now()}-${i}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        title,
        cwd: needsWorkspace ? '' : cwd.trim(),
        startupCommand: '',
        shell,
      }));

      addPanesBatch(workspace.id, batch);

      if (onAddBatch) {
        onAddBatch(take, shell || '', cwd.trim());
      }

      close();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add terminals',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    }
  };

  const room = activeWorkspace ? 9 - activeWorkspace.panes.length : 9;

  return (
    <div
      className="modal-backdrop modal-backdrop--enhanced"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal-dialog modal-dialog--lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terminal-config-title"
      >
        <div className="modal-header">
          <h2 id="terminal-config-title" className="modal-header__title">
            {needsWorkspace ? 'Create workspace & add terminal' : 'Add terminal'}
          </h2>
          <button
            type="button"
            className="modal-header__close"
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Quick launch tool presets */}
          {!needsWorkspace ? (
            <div className="modal-field">
              <span className="modal-field__label">Quick launch tool</span>
              <div className="tool-presets tool-presets--compact">
                {TOOL_PRESETS.filter((t) => t.id !== '9router').map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="tool-preset-card tool-preset-card--sm"
                    style={{ '--tool-color': tool.color } as React.CSSProperties}
                    onClick={() => {
                      const ws = activeWorkspace;
                      if (!ws) return;
                      useWorkspaceStore.getState().addPaneToWorkspace(ws.id, {
                        id: `${ws.id}-pane-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        title: tool.name,
                        cwd: cwd.trim() || '',
                        startupCommand: tool.command,
                      });
                      close();
                    }}
                    title={`Launch ${tool.name}`}
                  >
                    <span className="tool-preset-card__icon" style={{ background: tool.color }}>{tool.icon}</span>
                    <span className="tool-preset-card__name">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {needsWorkspace ? (
            <>
              <div className="modal-field">
                <label htmlFor="tc-ws-name" className="modal-field__label">
                  Workspace name
                </label>
                <input
                  id="tc-ws-name"
                  type="text"
                  className="modal-field__input"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="My workspace"
                  autoComplete="off"
                />
              </div>

              <ColorPicker
                id="tc-ws-color"
                label="Accent color"
                value={wsColor}
                onChange={setWsColor}
              />

              <div className="modal-field__divider" />
            </>
          ) : null}

          <div className="modal-field">
            <label htmlFor="tc-shell" className="modal-field__label">
              Shell
            </label>
            <select
              ref={shellInputRef}
              id="tc-shell"
              className="modal-field__select"
              value={shellPreset}
              onChange={(e) => setShellPreset(e.target.value as ShellPresetId)}
            >
              {SHELL_PRESETS.map((shell) => (
                <option key={shell.id} value={shell.id}>
                  {shell.name}
                </option>
              ))}
            </select>
          </div>

          {shellPreset === 'custom' ? (
            <div className="modal-field">
              <label htmlFor="tc-custom-shell" className="modal-field__label">
                Custom shell path
              </label>
              <input
                id="tc-custom-shell"
                type="text"
                className="modal-field__input"
                value={customShell}
                onChange={(e) => setCustomShell(e.target.value)}
                placeholder="C:\path\to\shell.exe"
              />
            </div>
          ) : null}

          {!needsWorkspace ? (
            <FolderPicker
              id="tc-folder"
              label="Working directory (optional)"
              value={cwd}
              onChange={setCwd}
              placeholder="Leave empty to use workspace default"
            />
          ) : null}

          {activeWorkspace ? (
            <p className="modal-field__hint">
              {room} terminal{room !== 1 ? 's' : ''} remaining
            </p>
          ) : null}

          {error ? (
            <p className="modal-field__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={close}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          {!needsWorkspace && room >= 2 ? (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void handleAddBatch(2)}
              disabled={isSubmitting}
            >
              Add 2 panes
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleAddPane()}
            disabled={isSubmitting || (needsWorkspace && !wsName.trim())}
          >
            {isSubmitting
              ? 'Adding…'
              : needsWorkspace
                ? 'Create & add terminal'
                : 'Add pane'}
          </button>
        </div>
      </div>
    </div>
  );
}
