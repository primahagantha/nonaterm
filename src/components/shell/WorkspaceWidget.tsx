import { useState, useEffect } from 'react';

/**
 * Workspace-scoped widget (PRD Section 9 - Wave Terminal).
 * A simple notes/links panel per workspace that persists in localStorage.
 */
export function WorkspaceWidget({ workspaceId }: { workspaceId: string }) {
  const storageKey = `nonaterm:widget:${workspaceId}`;
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || '';
    } catch {
      return '';
    }
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, notes);
    } catch {
      // quota exceeded
    }
  }, [notes, storageKey]);

  return (
    <div className="workspace-widget">
      <button
        type="button"
        className="workspace-widget__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span aria-hidden="true">📝</span>
        <span>Notes</span>
        {notes.trim() ? <span className="workspace-widget__dot" /> : null}
      </button>
      {expanded ? (
        <textarea
          className="workspace-widget__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Quick notes, links, TODOs for this workspace..."
          rows={6}
          aria-label="Workspace notes"
        />
      ) : null}
    </div>
  );
}
