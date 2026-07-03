import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type ShortcutGroup = {
  title: string;
  items: Array<{
    keys: string[];
    description: string;
  }>;
};

function getShortcutGroups(workspaceCount: number): ShortcutGroup[] {
  return [
    {
      title: 'Global',
      items: [
        { keys: ['Ctrl', '.'], description: 'Show this shortcut list' },
        { keys: ['Ctrl', ','], description: 'Open options menu' },
        { keys: ['Esc'], description: 'Close any open menu or modal' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        ...Array.from({ length: Math.min(workspaceCount, 9) }, (_, index) => ({
          keys: [`Alt`, `${index + 1}`],
          description: `Switch to workspace #${index + 1}`,
        })),
        { keys: ['Click', '+', '✎'], description: 'Rename a workspace' },
        { keys: ['Click', '+', '✕'], description: 'Delete a workspace' },
      ],
    },
    {
      title: 'Terminal',
      items: [
        { keys: ['Ctrl', 'C'], description: 'Send interrupt (passes through)' },
        { keys: ['Ctrl', 'D'], description: 'Send EOF (passes through)' },
        {
          keys: ['Ctrl', 'Shift', 'T'],
          description: 'Open new terminal launcher',
        },
        { keys: ['Click', '+', 'Restart'], description: 'Restart a pane' },
      ],
    },
  ];
}

/** Modal daftar shortcut yang dipicu dengan Ctrl+. */
export function ShortcutsModal() {
  const open = useSettingsStore((state) => state.shortcutsOpen);
  const setOpen = useSettingsStore((state) => state.setShortcutsOpen);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open, { onClose: () => setOpen(false) });

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  const groups = useMemo(
    () => getShortcutGroups(workspaces.length),
    [workspaces.length],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return groups;
    }
    return groups
      .map((group) => ({
        title: group.title,
        items: group.items.filter(
          (item) =>
            item.description.toLowerCase().includes(q) ||
            item.keys.some((key) => key.toLowerCase().includes(q)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        className="shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shortcuts-modal__header">
          <h2>Keyboard Shortcuts</h2>
          <button
            type="button"
            className="shortcuts-modal__close"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts"
          >
            ✕
          </button>
        </header>
        <div className="shortcuts-modal__search">
          <input
            ref={inputRef}
            type="search"
            className="shortcuts-modal__input"
            placeholder="Filter shortcuts…"
            aria-label="Filter shortcuts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="shortcuts-modal__list">
          {filtered.length === 0 ? (
            <p className="shortcuts-modal__empty">No shortcuts match.</p>
          ) : (
            filtered.map((group) => (
              <section key={group.title} className="shortcuts-modal__group">
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map((item, index) => (
                    <li key={`${group.title}-${index}`}>
                      <span className="shortcuts-modal__keys">
                        {item.keys.map((key, keyIndex) => (
                          <kbd key={`${key}-${keyIndex}`}>{key}</kbd>
                        ))}
                      </span>
                      <span className="shortcuts-modal__desc">
                        {item.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
