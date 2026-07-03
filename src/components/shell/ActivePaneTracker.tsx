import { useEffect } from 'react';
import { useFocusStore } from '@/stores/focusStore';

/**
 * Listens for focusin events globally and updates the
 * `activePaneId` in `focusStore` based on the closest
 * `[data-pane-id]` ancestor. Mounted once at the AppShell
 * level so the app-level shortcut handlers know which pane
 * is currently focused.
 */
export function ActivePaneTracker() {
  const setActivePaneId = useFocusStore((state) => state.setActivePaneId);

  useEffect(() => {
    const handler = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const pane = target.closest('[data-pane-id]');
      const paneId = pane?.getAttribute('data-pane-id') ?? null;
      setActivePaneId(paneId);
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, [setActivePaneId]);

  return null;
}
