import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

/**
 * Tracks which pane currently has DOM focus, so that
 * app-level shortcuts (e.g. Ctrl+Shift+Esc to toggle
 * Passthrough Mode) can target it. Updated by the
 * `ActivePaneTracker` component on every focusin.
 */
type FocusStore = {
  activePaneId: string | null;
  setActivePaneId: (paneId: string | null) => void;
};

export const useFocusStore = create<FocusStore>((set) => ({
  activePaneId: null,
  setActivePaneId: (paneId) => set({ activePaneId: paneId }),
}));

export function selectIsPassthroughEnabled(
  settings: ReturnType<typeof useSettingsStore.getState>,
  paneId: string | null,
): boolean {
  if (!paneId) {
    return false;
  }
  return settings.passthroughPanes.includes(paneId);
}
