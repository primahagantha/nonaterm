import { buildDefaultRegistry, type KeybindRegistry } from '@/lib/keybind';
import { registerShortcuts } from '@/hooks/useKeybind';
import { useSettingsStore } from '@/stores/settingsStore';

let cached: KeybindRegistry | null = null;

export function getKeybindRegistry(): KeybindRegistry {
  if (!cached) {
    cached = buildDefaultRegistry();
    // Apply any persisted overrides from settings.
    cached.setOverrides(useSettingsStore.getState().keybindOverrides);
  }
  return cached;
}

export type RegisterAppShortcutsOptions = {
  setShortcutsOpen: (open: boolean) => void;
  setOptionsOpen: (open: boolean) => void;
  openCreateWorkspaceModal: () => void;
  openFastLaunchModal: () => void;
  closeTopModal: () => void;
  toggleCommandPalette: () => void;
  togglePassthroughForActivePane?: () => void;
  activePaneId?: () => string | undefined;
};

/** Register all global app shortcuts. Returns a disposer. */
export function registerAppShortcuts(opts: RegisterAppShortcutsOptions) {
  const registry = getKeybindRegistry();
  return registerShortcuts(registry, [
    {
      id: 'app.shortcuts',
      combo: { key: '.', ctrl: true },
      description: 'Show keyboard shortcuts',
      scope: 'app',
      handler: () => opts.setShortcutsOpen(true),
    },
    {
      id: 'app.options',
      combo: { key: ',', ctrl: true },
      description: 'Open options menu',
      scope: 'app',
      handler: () => opts.setOptionsOpen(true),
    },
    {
      id: 'app.newWorkspace',
      combo: { key: 'N', ctrl: true },
      description: 'Create a new workspace',
      scope: 'app',
      handler: () => opts.openCreateWorkspaceModal(),
    },
    {
      id: 'app.fastLaunch',
      combo: { key: 'K', ctrl: true },
      description: 'Quick launch terminal',
      scope: 'app',
      handler: () => opts.openFastLaunchModal(),
    },
    {
      id: 'app.escape',
      combo: { key: 'Escape' },
      description: 'Close any open modal or menu',
      scope: 'app',
      runInEditable: true,
      handler: () => opts.closeTopModal(),
    },
    {
      id: 'app.commandPalette',
      combo: { key: 'P', ctrl: true, shift: true },
      description: 'Open command palette',
      scope: 'app',
      handler: () => opts.toggleCommandPalette(),
    },
    {
      id: 'app.togglePassthrough',
      combo: { key: 'Escape', ctrl: true, shift: true },
      description: 'Toggle Passthrough Mode for the active terminal pane',
      scope: 'app',
      runInEditable: true,
      alwaysClaim: false,
      handler: () => {
        opts.togglePassthroughForActivePane?.();
      },
    },
  ]);
}
