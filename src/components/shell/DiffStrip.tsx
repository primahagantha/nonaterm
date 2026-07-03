import { useEffect, useState } from 'react';
import { systemStartFileWatcher } from '@/lib/tauri';

/**
 * Agent Edit Diff Strip (PRD Section 11.4).
 * Shows a mini indicator when files change in the workspace.
 * Click to see changed files.
 */

type FileChange = {
  path: string;
  timestamp: number;
};

export function DiffStrip({ workspaceId, cwd }: { workspaceId: string; cwd?: string }) {
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Start file watcher for this workspace
  useEffect(() => {
    if (!cwd) return;

    // Start watching the workspace directory
    systemStartFileWatcher(workspaceId, cwd).catch((err) => {
      console.error('Failed to start file watcher:', err);
    });
  }, [workspaceId, cwd]);

  // Listen for file change events from the backend
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.workspaceId === workspaceId) {
        setChanges((prev) => [
          ...prev.slice(-19), // keep last 20
          { path: detail.path, timestamp: Date.now() },
        ]);
      }
    };
    window.addEventListener('Nonaterm:file-changed', handler);
    return () => window.removeEventListener('Nonaterm:file-changed', handler);
  }, [workspaceId]);

  if (changes.length === 0) return null;

  const recentChanges = changes.slice(-5);
  const uniqueFiles = new Set(changes.map((c) => c.path)).size;

  return (
    <div className="diff-strip">
      <button
        type="button"
        className="diff-strip__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        title={`${uniqueFiles} file${uniqueFiles > 1 ? 's' : ''} changed`}
      >
        <span className="diff-strip__icon" aria-hidden="true">±</span>
        <span>{uniqueFiles} changed</span>
      </button>
      {expanded ? (
        <ul className="diff-strip__list">
          {recentChanges.map((change, i) => (
            <li key={`${change.timestamp}-${i}`} className="diff-strip__item">
              <span className="diff-strip__path">{change.path.split(/[/\\]/).pop()}</span>
              <span className="diff-strip__time">
                {new Date(change.timestamp).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
