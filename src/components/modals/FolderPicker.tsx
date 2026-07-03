import { useRef, useState } from 'react';
import { pickFolder } from '@/lib/tauri';

type FolderPickerProps = {
  value: string;
  onChange: (folder: string) => void;
  recentFolders?: string[];
  onRecentSelect?: (folder: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
};

/**
 * Reusable folder picker component with browse button and recent folders.
 */
export function FolderPicker({
  value,
  onChange,
  recentFolders = [],
  onRecentSelect,
  placeholder = 'Working directory (optional)',
  label,
  id,
}: FolderPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleBrowse = async () => {
    try {
      setError(null);
      const folder = await pickFolder();
      if (folder) {
        onChange(folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Folder picker failed');
    }
  };

  const inputId = id || 'folder-picker';

  return (
    <div className="modal-field">
      {label ? (
        <label htmlFor={inputId} className="modal-field__label">
          {label}
        </label>
      ) : null}
      
      <div className="modal-input-group">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="modal-field__input modal-input-group__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? 'true' : 'false'}
        />
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => void handleBrowse()}
        >
          Browse…
        </button>
      </div>

      {error ? (
        <span id={`${inputId}-error`} className="modal-field__error" role="alert">
          {error}
        </span>
      ) : null}

      {recentFolders.length > 0 && onRecentSelect ? (
        <div className="recent-folders">
          <span className="modal-field__hint">Recent folders</span>
          {recentFolders.slice(0, 5).map((folder) => (
            <button
              key={folder}
              type="button"
              className="recent-folder"
              onClick={() => onRecentSelect(folder)}
              title={folder}
            >
              <span className="recent-folder__icon" aria-hidden="true">📁</span>
              <span className="recent-folder__path">{folder}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
