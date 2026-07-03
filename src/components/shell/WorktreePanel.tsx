import { useState, useEffect } from 'react';
import { gitDetectRepo, gitCreateWorktree } from '@/lib/tauri';

type Worktree = {
  path: string;
  branch: string | null;
  headSha: string | null;
  isMain: boolean;
};

type RepoInfo = {
  root: string;
  currentBranch: string | null;
  headSha: string | null;
  isWorktree: boolean;
  worktrees: Worktree[];
};

/**
 * Worktree Panel (PRD Section 11.6) — manage git worktrees.
 * List, create, and bind worktrees to workspaces.
 */
export function WorktreePanel({ cwd }: { cwd?: string }) {
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranch, setNewBranch] = useState('');
  const [creating, setCreating] = useState(false);

  // Detect repo when cwd changes
  useEffect(() => {
    if (!cwd) {
      setRepoInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    gitDetectRepo(cwd)
      .then((info) => {
        setRepoInfo(info);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Not a git repository');
        setRepoInfo(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cwd]);

  const handleCreateWorktree = async () => {
    if (!repoInfo || !newBranch.trim()) return;

    setCreating(true);
    setError(null);

    try {
      await gitCreateWorktree({
        repo: repoInfo.root,
        branch: newBranch.trim(),
        createBranch: true,
        base: null,
      });

      // Refresh worktree list
      const updated = await gitDetectRepo(repoInfo.root);
      setRepoInfo(updated);
      setShowCreateForm(false);
      setNewBranch('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worktree');
    } finally {
      setCreating(false);
    }
  };

  if (!cwd) {
    return (
      <div className="worktree-panel">
        <p className="worktree-panel__empty">No working directory set.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="worktree-panel">
        <p className="worktree-panel__loading">Detecting git repository...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="worktree-panel">
        <p className="worktree-panel__error">{error}</p>
      </div>
    );
  }

  if (!repoInfo) {
    return (
      <div className="worktree-panel">
        <p className="worktree-panel__empty">Not a git repository.</p>
      </div>
    );
  }

  return (
    <div className="worktree-panel">
      <div className="worktree-panel__header">
        <span className="worktree-panel__title">Git Worktrees</span>
        <span className="worktree-panel__branch">
          {repoInfo.currentBranch ?? 'detached'} @ {repoInfo.headSha ?? '?'}
        </span>
      </div>

      <ul className="worktree-panel__list">
        {repoInfo.worktrees.map((wt, i) => (
          <li key={i} className={`worktree-panel__item${wt.isMain ? ' worktree-panel__item--main' : ''}`}>
            <div className="worktree-panel__item-info">
              <span className="worktree-panel__item-branch">{wt.branch ?? 'detached'}</span>
              <span className="worktree-panel__item-path">{wt.path}</span>
            </div>
            {wt.isMain ? (
              <span className="worktree-panel__badge">main</span>
            ) : null}
          </li>
        ))}
      </ul>

      {showCreateForm ? (
        <div className="worktree-panel__create-form">
          <input
            type="text"
            className="modal-field__input"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            placeholder="new-branch-name"
            disabled={creating}
          />
          <div className="worktree-panel__create-actions">
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              onClick={() => setShowCreateForm(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => void handleCreateWorktree()}
              disabled={!newBranch.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => setShowCreateForm(true)}
        >
          + New worktree
        </button>
      )}
    </div>
  );
}
