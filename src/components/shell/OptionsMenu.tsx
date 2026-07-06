import { useSettingsStore } from '@/stores/settingsStore';

/** Trigger button for the fullpage settings. The actual settings UI
 *  lives in SettingsPage which renders inside app-main when open. */
export function OptionsMenu() {
  const toggleOptions = useSettingsStore((state) => state.toggleOptions);

  return (
    <div className="options-menu">
      <button
        type="button"
        className="icon-button options-menu__trigger icon-button--primary"
        onClick={toggleOptions}
        aria-label="Open options menu (Ctrl+,)"
        title="Options (Ctrl+,)"
      >
        <span className="icon-button__icon options-menu__icon" aria-hidden="true">
          ⚙
        </span>
      </button>
    </div>
  );
}
