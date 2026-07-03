import { useState, useEffect } from 'react';

const DEFAULT_PRESET_COLORS = [
  '#7c3aed', // Violet
  '#0ea5e9', // Sky
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  allowCustom?: boolean;
  label?: string;
  id?: string;
};

/**
 * Reusable color picker component with preset swatches and custom hex input.
 */
export function ColorPicker({
  value,
  onChange,
  presetColors = DEFAULT_PRESET_COLORS,
  allowCustom = true,
  label,
  id,
}: ColorPickerProps) {
  const [customValue, setCustomValue] = useState(value);
  const [isValidHex, setIsValidHex] = useState(true);

  const inputId = id || 'color-picker';

  // Validate hex color
  useEffect(() => {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    setIsValidHex(hexRegex.test(customValue));
  }, [customValue]);

  const handleSwatchClick = (color: string) => {
    onChange(color);
    setCustomValue(color);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Auto-add # if missing
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }
    
    setCustomValue(newValue);
    
    // Only update parent if valid hex
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (hexRegex.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleCustomBlur = () => {
    // Reset to current value if invalid
    if (!isValidHex) {
      setCustomValue(value);
    }
  };

  return (
    <div className="modal-field">
      {label ? (
        <label htmlFor={inputId} className="modal-field__label">
          {label}
        </label>
      ) : null}
      
      <div className="color-picker">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            className={`color-picker__swatch${
              value.toLowerCase() === color.toLowerCase()
                ? ' color-picker__swatch--active'
                : ''
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handleSwatchClick(color)}
            title={color}
            aria-label={`Select color ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
          />
        ))}
        
        {allowCustom ? (
          <div className="color-picker__custom">
            <input
              id={inputId}
              type="text"
              className={`color-picker__input${
                !isValidHex ? ' modal-field__input--error' : ''
              }`}
              value={customValue}
              onChange={handleCustomChange}
              onBlur={handleCustomBlur}
              placeholder="#7c3aed"
              maxLength={7}
              aria-describedby={!isValidHex ? `${inputId}-error` : undefined}
              aria-invalid={!isValidHex ? 'true' : 'false'}
            />
          </div>
        ) : null}
      </div>

      {!isValidHex ? (
        <span id={`${inputId}-error`} className="modal-field__error" role="alert">
          Invalid hex color
        </span>
      ) : null}
    </div>
  );
}
