import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  gitCreateWorktree,
  workspaceOpenInNewWindow,
} from '@/lib/tauri';
import { ConfirmDialog } from '@/components/shell/Dialogs';
import { AttentionInbox } from '@/components/shell/AttentionInbox';
import { WorkspaceWidget } from '@/components/shell/WorkspaceWidget';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** Sidebar workspace untuk switch cepat antar proyek. */
export function WorkspaceSidebar() {
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const setActiveWorkspace = useWorkspaceStore(
    (state) => state.setActiveWorkspace,
  );
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const renameWorkspace = useWorkspaceStore((state) => state.renameWorkspace);
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
  const closeWorkspace = useWorkspaceStore((state) => state.closeWorkspace);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
  const collapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar);
  const setShortcutsOpen = useSettingsStore((state) => state.setShortcutsOpen);
  const sessions = useTerminalStore((state) => state.sessions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [query, setQuery] = useState('');
  const [pendingClose, setPendingClose] = useState<{
    id: string;
    name: string;
    running: number;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [worktreePrompt, setWorktreePrompt] = useState<{
    folder: string;
    repo: string;
    branch: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return workspaces;
    }
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.panes.some((p) => p.title.toLowerCase().includes(q)),
    );
  }, [workspaces, query]);

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameWorkspace(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleNew = () => {
    const count = workspaces.length + 1;
    createWorkspace(`Workspace ${count}`);
    // Auto-start inline rename on the newly created workspace
    const newWs = useWorkspaceStore.getState().workspaces;
    const created = newWs[newWs.length - 1];
    if (created) {
      requestAnimationFrame(() => startRename(created.id, created.name));
    }
  };

  const countRunningPanes = (workspaceId: string): number => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return 0;
    }
    return workspace.panes.filter((pane) => {
      const status = sessions[pane.id]?.status;
      return status === 'running' || status === 'spawning';
    }).length;
  };

  const requestClose = (workspaceId: string) => {
    if (workspaces.length <= 1) {
      return;
    }
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return;
    }
    const running = countRunningPanes(workspaceId);
    if (running > 0) {
      setPendingClose({
        id: workspaceId,
        name: workspace.name,
        running,
      });
      return;
    }
    closeWorkspace(workspaceId);
  };

  const [detachError, setDetachError] = useState<string | null>(null);

  const handleDetach = async (workspaceId: string) => {
    setDetachError(null);
    try {
      await workspaceOpenInNewWindow(workspaceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to detach workspace';
      setDetachError(msg);
      setTimeout(() => setDetachError(null), 5000);
    }
  };

  const confirmClose = () => {
    if (pendingClose) {
      closeWorkspace(pendingClose.id);
      setPendingClose(null);
    }
  };

  const saveAndClose = async () => {
    if (pendingClose) {
      try {
        const { stateSaveSnapshot } = await import('@/lib/tauri');
        const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
        await stateSaveSnapshot({
          activeWorkspaceId,
          workspaces,
          savedAt: new Date().toISOString(),
        });
      } catch {
        // best-effort save
      }
      closeWorkspace(pendingClose.id);
      setPendingClose(null);
    }
  };

  useEffect(() => {
    if (!pendingClose) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingClose(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingClose]);

  return (
    <aside
      className={`workspace-sidebar${collapsed ? ' workspace-sidebar--collapsed' : ''}`}
      aria-label="Workspaces"
      data-detach-error={detachError ?? undefined}
    >
      <div className="workspace-sidebar__brand">
        <span className="workspace-sidebar__logo" aria-hidden="true">
          N
        </span>
        {!collapsed ? (
          <div className="workspace-sidebar__brand-text">
            <div className="workspace-sidebar__title">Nonaterm</div>
            <div className="workspace-sidebar__subtitle">Workspaces</div>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <>
          <div className="workspace-sidebar__search">
            <span className="workspace-sidebar__search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Search workspaces…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search workspaces"
            />
          </div>

          <div className="workspace-sidebar__divider" />

          <AttentionInbox />
          <WorkspaceWidget workspaceId={activeWorkspaceId} />

          <nav className="workspace-list" aria-label="Workspaces">
            {filtered.length === 0 ? (
              <p
                style={{
                  margin: '0.4rem 0.5rem',
                  color: 'var(--tw-text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                No matches.
              </p>
            ) : (
              filtered.map((workspace) => {
                const isActive = workspace.id === activeWorkspaceId;
                const isEditing = editingId === workspace.id;
                return (
                  <div
                    key={workspace.id}
                    className={`workspace-list__item${isActive ? ' workspace-list__item--active' : ''}`}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="workspace-list__rename"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        aria-label="Rename workspace"
                      />
                    ) : (
                      <button
                        type="button"
                        className="workspace-list__select"
                        onClick={() => useWorkspaceStore.getState().setActiveWorkspace(workspace.id)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', workspace.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={(e) => {
                          // If dropped outside the window, detach to new window
                          if (e.dataTransfer.dropEffect === 'none') {
                            handleDetach(workspace.id);
                          }
                        }}
                        draggable
                        title={`${workspace.name} (drag to detach)`}
                      >
                        <span
                          className="workspace-list__swatch"
                          style={{ backgroundColor: workspace.accentColor }}
                          aria-hidden="true"
                        />
                        <span className="workspace-list__name">
                          {workspace.name}
                        </span>
                        <span className="workspace-list__badge">
                          {workspace.panes.length}
                        </span>
                      </button>
                    )}
                    <div className="workspace-list__actions">
                      <button
                        type="button"
                        className="workspace-list__btn"
                        title="Detach to new window (multi-monitor)"
                        aria-label="Detach to new window"
                        onClick={() => void handleDetach(workspace.id)}
                        data-testid={`detach-workspace-${workspace.id}`}
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="workspace-list__btn"
                        title="Rename"
                        aria-label="Rename workspace"
                        onClick={() =>
                          startRename(workspace.id, workspace.name)
                        }
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="workspace-list__btn"
                        title="Close (with undo)"
                        aria-label="Close workspace"
                        disabled={workspaces.length <= 1}
                        onClick={() => requestClose(workspace.id)}
                        data-testid={`close-workspace-${workspace.id}`}
                      >
                        ⊗
                      </button>
                      <button
                        type="button"
                        className="workspace-list__btn workspace-list__btn--danger"
                        title="Delete permanently"
                        aria-label={`Delete workspace ${workspace.name}`}
                        disabled={workspaces.length <= 1}
                        data-testid={`delete-workspace-${workspace.id}`}
                        onClick={() => {
                          setPendingDelete({
                            id: workspace.id,
                            name: workspace.name,
                          });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </nav>

          <button
            type="button"
            className="workspace-list__create"
            onClick={() => void handleNew()}
            title="Create a new workspace from a folder (Ctrl+Shift+N)"
          >
            <span aria-hidden="true">+</span>
            <span>+ New Workspace</span>
            <span className="kbd-hint">⌃⇧N</span>
          </button>
        </>
      ) : (
        <nav className="workspace-sidebar__collapsed-list" aria-label="Workspaces">
          {workspaces.slice(0, 9).map((ws, index) => (
            <button
              key={ws.id}
              type="button"
              className={`workspace-sidebar__collapsed-item${ws.id === activeWorkspaceId ? ' workspace-sidebar__collapsed-item--active' : ''}`}
              onClick={() => setActiveWorkspace(ws.id)}
              title={`${ws.name} (Alt+${index + 1})`}
              aria-label={`Switch to ${ws.name}`}
            >
              <span className="workspace-sidebar__collapsed-num">{index + 1}</span>
            </button>
          ))}
          <button
            type="button"
            className="workspace-sidebar__collapsed-item"
            onClick={() => void handleNew()}
            title="Create workspace"
            aria-label="Create new workspace"
          >
            <span className="workspace-sidebar__collapsed-num">+</span>
          </button>
        </nav>
      )}

      {pendingClose
        ? createPortal(
            <div
              className="modal-backdrop"
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirm close workspace"
              onClick={() => setPendingClose(null)}
            >
              <div
                className="modal-dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 className="modal-dialog__title">
                  Close "{pendingClose.name}"?
                </h2>
                <div className="modal-dialog__body">
                  <p>
                    {pendingClose.running} terminal{pendingClose.running === 1 ? ' is' : 's are'}{' '}
                    still running. Closing will stop the process without
                    further confirmation.
                  </p>
                </div>
                <div className="modal-dialog__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPendingClose(null)}
                    data-testid="close-confirm-cancel"
                    autoFocus
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--secondary"
                    onClick={() => void saveAndClose()}
                    data-testid="close-confirm-save"
                  >
                    Save &amp; Close
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={confirmClose}
                    data-testid="close-confirm-confirm"
                  >
                    Close without saving
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {worktreePrompt
        ? createPortal(
            <WorktreeDialog
              folder={worktreePrompt.folder}
              repo={worktreePrompt.repo}
              defaultBranch={worktreePrompt.branch}
              onCancel={() => {
                const label =
                  worktreePrompt.folder.split(/[\\/]/).filter(Boolean).pop() ||
                  'Workspace';
                createWorkspace(label, '#7c3aed', worktreePrompt.folder);
                setWorktreePrompt(null);
              }}
              onConfirm={(worktreePath, branch) => {
                const label =
                  worktreePath.split(/[\\/]/).filter(Boolean).pop() || branch;
                createWorkspace(label, '#7c3aed', worktreePath);
                setWorktreePrompt(null);
              }}
            />,
            document.body,
          )
        : null}

      {createPortal(
        <ConfirmDialog
          open={pendingDelete !== null}
          title="Delete workspace?"
          body={
            pendingDelete ? (
              <p>
                Permanently delete <strong>"{pendingDelete.name}"</strong>?
                This action cannot be undone.
              </p>
            ) : null
          }
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            if (pendingDelete) {
              deleteWorkspace(pendingDelete.id);
              setPendingDelete(null);
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />,
        document.body,
      )}

      <div className="workspace-sidebar__footer">
        <button
          type="button"
          className="workspace-sidebar__collapse"
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
        >
          {collapsed ? '›' : '‹ Collapse'}
        </button>
        {!collapsed ? (
          <button
            type="button"
            className="workspace-sidebar__collapse"
            onClick={() => setShortcutsOpen(true)}
            title="Show keyboard shortcuts (Ctrl+.)"
            style={{ textAlign: 'left' }}
          >
            <span aria-hidden="true">⌘</span> Shortcuts
            <span className="kbd-hint" style={{ marginLeft: 'auto' }}>⌃.</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function WorktreeDialog({
  folder,
  repo,
  defaultBranch,
  onCancel,
  onConfirm,
}: {
  folder: string;
  repo: string;
  defaultBranch: string;
  onCancel: () => void;
  onConfirm: (worktreePath: string, branch: string) => void;
}) {
  const [createBranch, setCreateBranch] = useState(true);
  const [branch, setBranch] = useState(defaultBranch || 'feature/');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await gitCreateWorktree({
        repo,
        branch: branch.trim(),
        createBranch,
        base: defaultBranch || null,
      });
      onConfirm(result.worktreePath, result.branch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worktree');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Bind to Git Worktree"
      onClick={onCancel}
    >
      <div
        className="shortcuts-modal"
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(480px, 92vw)' }}
      >
        <header className="shortcuts-modal__header">
          <h2>Bind to Git Worktree</h2>
          <button
            type="button"
            className="shortcuts-modal__close"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="options-menu__content">
          <p className="options-menu__hint">
            Repo <code>{repo}</code> detected. Optional: create a git
            worktree branch at <code>{folder}/.worktrees/&lt;branch&gt;</code>
            so each agent in this workspace works in a separate directory,
            preventing file stomping (PRD §11 #6).
          </p>
          <div className="options-menu__field">
            <label className="options-menu__label">
              <input
                type="checkbox"
                checked={createBranch}
                onChange={(event) => setCreateBranch(event.target.checked)}
              />{' '}
              Create new branch (unchecked = attach to existing branch)
            </label>
          </div>
          <div className="options-menu__field">
            <label className="options-menu__label" htmlFor="worktree-branch">
              Branch
            </label>
            <input
              id="worktree-branch"
              className="options-menu__select"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder={createBranch ? 'feature/my-branch' : defaultBranch}
              disabled={busy}
              autoFocus
            />
          </div>
          {error ? (
            <p className="keybinds-list__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="close-confirm__actions">
            <button
              type="button"
              className="btn btn--sm"
              onClick={onCancel}
              disabled={busy}
            >
              Skip (use folder)
            </button>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={handleCreate}
              disabled={busy || !branch.trim()}
              data-testid="worktree-create"
            >
              {busy ? 'Creating…' : 'Create worktree'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
