import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Snippet Library (PRD Section 8) — save and reuse frequently used commands.
 * Displays a list of snippets that can be copied to clipboard or injected into terminal.
 */
export function SnippetPanel() {
  const snippets = useSettingsStore((s) => s.snippets);
  const addSnippet = useSettingsStore((s) => s.addSnippet);
  const removeSnippet = useSettingsStore((s) => s.removeSnippet);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (!name.trim() || !command.trim()) return;
    addSnippet(name.trim(), command.trim());
    setName('');
    setCommand('');
  };

  const handleCopy = async (command: string, index: number) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // clipboard API may fail in some environments
    }
  };

  return (
    <div className="snippet-panel">
      <button
        type="button"
        className="snippet-panel__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span aria-hidden="true">📋</span>
        <span>Snippets</span>
        {snippets.length > 0 ? (
          <span className="snippet-panel__badge">{snippets.length}</span>
        ) : null}
      </button>
      {expanded ? (
        <div className="snippet-panel__content">
          {snippets.length === 0 ? (
            <p className="snippet-panel__empty">No snippets saved yet.</p>
          ) : (
            <ul className="snippet-panel__list">
              {snippets.map((snippet, i) => (
                <li key={i} className="snippet-panel__item">
                  <div className="snippet-panel__item-info">
                    <span className="snippet-panel__item-name">{snippet.name}</span>
                    <code className="snippet-panel__item-command">{snippet.command}</code>
                  </div>
                  <div className="snippet-panel__item-actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => void handleCopy(snippet.command, i)}
                      title="Copy to clipboard"
                    >
                      {copiedIndex === i ? '✓' : '📋'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost btn--danger"
                      onClick={() => removeSnippet(i)}
                      title="Delete snippet"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="snippet-panel__add">
            <input
              type="text"
              className="snippet-panel__input"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Snippet name"
            />
            <input
              type="text"
              className="snippet-panel__input"
              placeholder="Command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              aria-label="Snippet command"
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
        </div>
      ) : null}
    </div>
  );
}
