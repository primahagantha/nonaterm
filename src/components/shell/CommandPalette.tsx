import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFocusStore } from '@/stores/focusStore';
import { searchHistory, getRecentCommands } from '@/lib/commandHistory';

type Command = {
  id: string;
  label: string;
  category: string;
  action: () => void;
};

/** Command palette overlay triggered by Ctrl+Shift+P. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActive = useWorkspaceStore((s) => s.setActiveWorkspace);
  const setOptionsOpen = useSettingsStore((s) => s.setOptionsOpen);
  const setShortcutsOpen = useSettingsStore((s) => s.setShortcutsOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const togglePassthrough = useSettingsStore((s) => s.togglePassthrough);
  const activePaneId = useFocusStore((s) => s.activePaneId);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => [
    ...workspaces.map((ws) => ({
      id: `switch-${ws.id}`,
      label: `Switch to ${ws.name}`,
      category: 'Workspace',
      action: () => setActive(ws.id),
    })),
    {
      id: 'new-workspace',
      label: 'Create new workspace',
      category: 'Workspace',
      action: () => {
        useUiStore.getState().openCreateWorkspaceModal();
      },
    },
    {
      id: 'open-options',
      label: 'Open settings',
      category: 'App',
      action: () => setOptionsOpen(true),
    },
    {
      id: 'open-shortcuts',
      label: 'Show keyboard shortcuts',
      category: 'App',
      action: () => setShortcutsOpen(true),
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle sidebar',
      category: 'App',
      action: () => toggleSidebar(),
    },
    {
      id: 'toggle-passthrough',
      label: 'Toggle passthrough mode',
      category: 'Terminal',
      action: () => {
        if (activePaneId) togglePassthrough(activePaneId);
      },
    },
    // Recent commands from history
    ...getRecentCommands(5).map((cmd) => ({
      id: `history-${cmd}`,
      label: `Run: ${cmd}`,
      category: 'History',
      action: () => {
        // Copy to clipboard
        navigator.clipboard?.writeText(cmd).catch(() => {});
      },
    })),
  ], [workspaces, setActive, setOptionsOpen, setShortcutsOpen, toggleSidebar, togglePassthrough, activePaneId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;

    // Search history when query looks like a command search
    const historyResults = searchHistory(q).map((entry) => ({
      id: `history-${entry.timestamp}`,
      label: entry.command,
      category: `History (${entry.workspaceId})`,
      action: () => {
        navigator.clipboard?.writeText(entry.command).catch(() => {});
      },
    }));

    const commandResults = commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q),
    );

    return [...historyResults.slice(0, 5), ...commandResults];
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[selectedIndex];
        if (cmd) {
          cmd.action();
          setOpen(false);
        }
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selectedIndex, setOpen]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div
        ref={dialogRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="command-palette__input"
          placeholder="Type a command..."
          aria-label="Search commands"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <ul className="command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <li className="command-palette__empty">No commands match.</li>
          ) : (
            filtered.map((cmd, i) => (
              <li
                key={cmd.id}
                role="option"
                aria-selected={i === selectedIndex}
                className={`command-palette__item${i === selectedIndex ? ' command-palette__item--selected' : ''}`}
                onClick={() => {
                  cmd.action();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="command-palette__item-label">{cmd.label}</span>
                <span className="command-palette__item-category">{cmd.category}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
