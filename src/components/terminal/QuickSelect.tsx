import { useState, useCallback } from 'react';

type QuickSelectProps = {
  onSelect: (text: string) => void;
  onClose: () => void;
};

export function QuickSelectOverlay({ onSelect, onClose }: QuickSelectProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && input.trim()) {
        onSelect(input.trim());
        onClose();
      }
    },
    [input, onSelect, onClose],
  );

  return (
    <div className="quick-select" role="dialog" aria-label="Quick select">
      <div className="quick-select__content">
        <span className="quick-select__label">Quick Select</span>
        <input
          type="text"
          className="quick-select__input"
          placeholder="Type to filter patterns..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          aria-label="Filter patterns"
        />
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={onClose}
        >
          Esc
        </button>
      </div>
    </div>
  );
}
