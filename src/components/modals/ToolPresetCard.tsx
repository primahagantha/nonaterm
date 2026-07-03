import type { ToolPreset } from './toolPresets';

type ToolPresetCardProps = {
  preset: ToolPreset;
  selected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  custom?: boolean;
};

/**
 * Reusable tool preset card component for FastLaunchModal.
 */
export function ToolPresetCard({
  preset,
  selected,
  onSelect,
  onRemove,
  custom,
}: ToolPresetCardProps) {
  return (
    <button
      type="button"
      className={`tool-preset${selected ? ' tool-preset--selected' : ''}${custom ? ' tool-preset--custom' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      title={`Launch ${preset.name} (${preset.command})`}
    >
      <div
        className="tool-preset__icon"
        aria-hidden="true"
        style={{ background: preset.color }}
      >
        {preset.icon}
      </div>
      <span className="tool-preset__name">{preset.name}</span>
      <span className="tool-preset__command">{preset.command}</span>
      {onRemove ? (
        <button
          type="button"
          className="tool-preset__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${preset.name}`}
          title="Remove custom tool"
        >
          ✕
        </button>
      ) : null}
    </button>
  );
}
