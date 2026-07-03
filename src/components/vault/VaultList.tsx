import { useEffect, useState } from 'react';
import { VaultDialog, type VaultEntry, type VaultEntryInput } from './VaultDialog';
import { invoke } from '@tauri-apps/api/core';

/**
 * Vault list component for managing SSH connections.
 * Shows in a dialog that doesn't block running processes.
 */
export function VaultList() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<VaultEntry | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await invoke<VaultEntry[]>('vault_list');
      setEntries(data);
    } catch (err) {
      console.error('Failed to load vault entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const handleSave = async (input: VaultEntryInput) => {
    try {
      if (editEntry) {
        await invoke('vault_update', { id: editEntry.id, input });
      } else {
        await invoke('vault_create', { input });
      }
      setDialogOpen(false);
      setEditEntry(null);
      await loadEntries();
    } catch (err) {
      console.error('Failed to save vault entry:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('vault_delete', { id });
      await loadEntries();
    } catch (err) {
      console.error('Failed to delete vault entry:', err);
    }
  };

  const handleEdit = (entry: VaultEntry) => {
    setEditEntry(entry);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditEntry(null);
    setDialogOpen(true);
  };

  const filtered = filter.trim()
    ? entries.filter((e) =>
        e.label.toLowerCase().includes(filter.toLowerCase()) ||
        e.host.toLowerCase().includes(filter.toLowerCase()) ||
        (e.groupName || '').toLowerCase().includes(filter.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase()))
      )
    : entries;

  // Group by groupName
  const groups = new Map<string, VaultEntry[]>();
  for (const entry of filtered) {
    const group = entry.groupName || 'Ungrouped';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(entry);
  }

  return (
    <div className="vault">
      <div className="vault__header">
        <input
          type="text"
          className="vault__filter"
          placeholder="Filter connections..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter connections"
        />
        <button type="button" className="btn btn--sm btn--primary" onClick={handleNew}>
          + New
        </button>
      </div>

      {loading ? (
        <p className="vault__empty">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="vault__empty">
          <p>No saved connections.</p>
          <p className="vault__hint">Click "+ New" to add an SSH connection.</p>
        </div>
      ) : (
        <div className="vault__groups">
          {Array.from(groups.entries()).map(([group, items]) => (
            <div key={group} className="vault__group">
              <h3 className="vault__group-title">{group}</h3>
              <div className="vault__entries">
                {items.map((entry) => (
                  <div key={entry.id} className="vault__entry">
                    <div className="vault__entry-info">
                      <div
                        className="vault__entry-dot"
                        style={{ background: entry.themeColor || 'var(--tw-accent)' }}
                      />
                      <div className="vault__entry-details">
                        <span className="vault__entry-label">{entry.label}</span>
                        <span className="vault__entry-host">
                          {entry.username}@{entry.host}:{entry.port}
                        </span>
                      </div>
                      {entry.tags.length > 0 ? (
                        <div className="vault__entry-tags">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="vault__tag">{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="vault__entry-actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => handleEdit(entry)}
                        aria-label={`Edit ${entry.label}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => handleDelete(entry.id)}
                        aria-label={`Delete ${entry.label}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <VaultDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
      />
    </div>
  );
}
