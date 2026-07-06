import { OptionsMenu } from '@/components/shell/OptionsMenu';
import { SettingsPage } from '@/components/shell/SettingsPage';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * @deprecated Replaced by {@link SettingsPage} (fullpage settings).
 * Kept as a re-export so older tests and references continue to compile.
 */
export function ConfigToolbar() {
  const optionsOpen = useSettingsStore((s) => s.optionsOpen);
  return optionsOpen ? <SettingsPage /> : <OptionsMenu />;
}
