import { useRef, useEffect, useState } from 'react';
import { gitCreateWorktree } from '@/lib/tauri';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FolderPicker } from './FolderPicker';
import { ColorPicker } from './ColorPicker';
import { SHELL_PRESETS } from './toolPresets';

/**
 * Modal dialog for creating a new workspace with name, folder, accent color, and shell selection.
 */
export function CreateWorkspaceModal() {
  const {
    createWorkspaceModalOpen: open,
    createWorkspaceForm: form,
    closeCreateWorkspaceModal: close,
    updateCreateWorkspaceForm: update,
  } = useUiStore();
  const { createWorkspace } = useWorkspaceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bindToWorktree, setBindToWorktree] = useState(false);
  const [branchName, setBranchName] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useFocusTrap(dialogRef, open);

  // Auto-focus name input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to allow animation
      const timeout = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
      setError(null);
      setBindToWorktree(false);
      setBranchName('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let cwd = form.folder.trim() || undefined;

      // If bind to worktree is enabled, create a worktree first
      if (bindToWorktree && cwd) {
        const branch = branchName.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-');
        try {
          const result = await gitCreateWorktree({
            repo: cwd,
            branch,
            createBranch: true,
            base: null,
          });
          cwd = result.worktreePath;
        } catch (worktreeErr) {
          const message = worktreeErr instanceof Error ? worktreeErr.message : 'Failed to create worktree';
          setError(message);
          setIsSubmitting(false);
          return;
        }
      }

      createWorkspace(
        form.name.trim(),
        form.accentColor,
        cwd,
      );

      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      console.error('Failed to create workspace:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    close();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className="modal-backdrop modal-backdrop--enhanced"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workspace-title"
      >
        <div className="modal-header">
          <h2 id="create-workspace-title" className="modal-header__title">
            Create workspace
          </h2>
          <button
            type="button"
            className="modal-header__close"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-body">
            <div className="modal-field">
              <label htmlFor="ws-name" className="modal-field__label">
                Workspace name
              </label>
              <input
                ref={nameInputRef}
                id="ws-name"
                type="text"
                className="modal-field__input"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="My workspace"
                autoComplete="off"
                required
              />
            </div>

            <FolderPicker
              id="ws-folder"
              label="Working directory (optional)"
              value={form.folder}
              onChange={(folder) => update({ folder })}
              recentFolders={[]}
              placeholder="Working directory (optional)"
            />

            {/* Git Worktree Binding */}
            {form.folder ? (
              <div className="modal-field">
                <label className="modal-field__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={bindToWorktree}
                    onChange={(e) => setBindToWorktree(e.target.checked)}
                  />
                  <span>Bind to Git Worktree (create isolated branch)</span>
                </label>
                {bindToWorktree ? (
                  <input
                    type="text"
                    className="modal-field__input"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder={form.name.trim().toLowerCase().replace(/\s+/g, '-') || 'branch-name'}
                    style={{ marginTop: '0.25rem' }}
                  />
                ) : null}
              </div>
            ) : null}

            <ColorPicker
              id="ws-color"
              label="Accent color"
              value={form.accentColor}
              onChange={(accentColor) => update({ accentColor })}
            />

            <div className="modal-field">
              <label htmlFor="ws-shell" className="modal-field__label">
                Default shell
              </label>
              <select
                id="ws-shell"
                className="modal-field__select"
                value={form.shell}
                onChange={(e) => update({ shell: e.target.value })}
              >
                {SHELL_PRESETS.filter((s) => s.id !== 'custom').map((shell) => (
                  <option key={shell.id} value={shell.command || 'powershell.exe'}>
                    {shell.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="modal-body">
              <p className="modal-field__error" role="alert">
                {error}
              </p>
            </div>
          ) : null}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!form.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
