import { useState } from 'react';

type CustomToolFormProps = {
  onSubmit: (tool: { name: string; command: string; icon: string; color: string; description?: string }) => void;
  onCancel: () => void;
  initial?: { name: string; command: string; icon: string; color: string; description?: string };
};

/**
 * Form for adding/editing custom tool presets in Quick Launch.
 */
export function CustomToolForm({ onSubmit, onCancel, initial }: CustomToolFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [command, setCommand] = useState(initial?.command ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [color, setColor] = useState(initial?.color ?? '#3b82f6');
  const [description, setDescription] = useState(initial?.description ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim() || !icon.trim()) return;
    onSubmit({
      name: name.trim(),
      command: command.trim(),
      icon: icon.trim().slice(0, 2),
      color,
      description: description.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="custom-tool-form">
      <div className="modal-field">
        <label htmlFor="tool-name" className="modal-field__label">Name</label>
        <input
          id="tool-name"
          type="text"
          className="modal-field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Agent"
          required
        />
      </div>
      <div className="modal-field">
        <label htmlFor="tool-command" className="modal-field__label">Command</label>
        <input
          id="tool-command"
          type="text"
          className="modal-field__input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="my-agent --flag"
          required
        />
      </div>
      <div className="fast-launch__row">
        <div className="modal-field" style={{ width: 100 }}>
          <label htmlFor="tool-icon" className="modal-field__label">Icon (2 chars)</label>
          <input
            id="tool-icon"
            type="text"
            className="modal-field__input"
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder="MA"
            maxLength={2}
            required
          />
        </div>
        <div className="modal-field" style={{ width: 120 }}>
          <label htmlFor="tool-color" className="modal-field__label">Color</label>
          <input
            id="tool-color"
            type="color"
            className="modal-field__input"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ height: 36, padding: '2px 4px' }}
          />
        </div>
      </div>
      <div className="modal-field">
        <label htmlFor="tool-desc" className="modal-field__label">Description (optional)</label>
        <input
          id="tool-desc"
          type="text"
          className="modal-field__input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this tool does"
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!name.trim() || !command.trim() || !icon.trim()}
        >
          {initial ? 'Save' : 'Add tool'}
        </button>
      </div>
    </form>
  );
}
