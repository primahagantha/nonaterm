import { create } from 'zustand';
import type { Combo, KeybindId } from '@/lib/keybind';
import {
  keybindClearAllOverrides,
  keybindClearOverride,
  keybindGetOverrides,
  keybindSetOverride,
  paneGetPassthroughList,
  paneSetPassthrough,
} from '@/lib/tauri';

export type ThemeMode = 'light' | 'dark';
export type CursorStyle = 'block' | 'underline' | 'bar';

export type SshConnection = {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  keyPath?: string;
  agentForwarding: boolean;
};

export type ThemeId =
  | 'midnight'
  | 'aurora'
  | 'solarized'
  | 'nord'
  | 'dracula'
  | 'monokai'
  | 'tokyo-night'
  | 'rose-pine'
  | 'catppuccin'
  | 'gruvbox'
  | 'one-dark'
  | 'synthwave'
  | 'everforest'
  | 'kanagawa';

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description: string;
  accent: string;
  preview: { bg: string; panel: string; text: string; accent: string };
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep indigo with violet glow',
    accent: '#8b5cf6',
    preview: { bg: '#0c0a1a', panel: '#100e24', text: '#f0ecff', accent: '#8b5cf6' },
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    description: 'Cyan on dark teal ocean',
    accent: '#22d3ee',
    preview: { bg: '#041218', panel: '#081c24', text: '#e0fffe', accent: '#22d3ee' },
  },
  solarized: {
    id: 'solarized',
    label: 'Solarized',
    description: 'Warm amber on deep teal',
    accent: '#cb9b51',
    preview: { bg: '#fdf6e3', panel: '#eee8d5', text: '#073642', accent: '#cb9b51' },
  },
  nord: {
    id: 'nord',
    label: 'Nord',
    description: 'Arctic frost, cool & calm',
    accent: '#88c0d0',
    preview: { bg: '#2e3440', panel: '#3b4252', text: '#eceff4', accent: '#88c0d0' },
  },
  dracula: {
    id: 'dracula',
    label: 'Dracula',
    description: 'Purple on dark slate',
    accent: '#bd93f9',
    preview: { bg: '#1e1f29', panel: '#252633', text: '#f8f8f2', accent: '#bd93f9' },
  },
  monokai: {
    id: 'monokai',
    label: 'Monokai',
    description: 'Warm green + yellow retro',
    accent: '#e6db74',
    preview: { bg: '#1d1e19', panel: '#252620', text: '#f8f8f2', accent: '#e6db74' },
  },
  'tokyo-night': {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    description: 'Deep violet with pink/neon',
    accent: '#bb9af7',
    preview: { bg: '#1a1b2e', panel: '#1f2137', text: '#c0caf5', accent: '#bb9af7' },
  },
  'rose-pine': {
    id: 'rose-pine',
    label: 'Rose Pine',
    description: 'Soft rose on dark wood',
    accent: '#eb6f92',
    preview: { bg: '#191724', panel: '#1f1d2e', text: '#e0def4', accent: '#eb6f92' },
  },
  catppuccin: {
    id: 'catppuccin',
    label: 'Catppuccin',
    description: 'Pastel cream on warm mocha',
    accent: '#f5c2e7',
    preview: { bg: '#1e1e2e', panel: '#252536', text: '#cdd6f4', accent: '#f5c2e7' },
  },
  gruvbox: {
    id: 'gruvbox',
    label: 'Gruvbox',
    description: 'Retro warm orange on dark earth',
    accent: '#fe8019',
    preview: { bg: '#1d2021', panel: '#282828', text: '#ebdbb2', accent: '#fe8019' },
  },
  'one-dark': {
    id: 'one-dark',
    label: 'One Dark',
    description: 'Atom\'s iconic dark palette',
    accent: '#61afef',
    preview: { bg: '#21252b', panel: '#282c34', text: '#abb2bf', accent: '#61afef' },
  },
  synthwave: {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Neon pink on deep purple night',
    accent: '#f97bbb',
    preview: { bg: '#130824', panel: '#1a0a33', text: '#e0d7ff', accent: '#f97bbb' },
  },
  everforest: {
    id: 'everforest',
    label: 'Everforest',
    description: 'Forest green on warm dark',
    accent: '#a7c080',
    preview: { bg: '#1e2326', panel: '#272e33', text: '#d3c6aa', accent: '#a7c080' },
  },
  kanagawa: {
    id: 'kanagawa',
    label: 'Kanagawa',
    description: 'Japanese ink with autumn red',
    accent: '#c34043',
    preview: { bg: '#1f1f28', panel: '#2a2a37', text: '#dcd7ba', accent: '#c34043' },
  },
};

type SettingsStore = {
  themeMode: ThemeMode;
  themeId: ThemeId;
  fontFamily: string;
  fontSize: number;
  shortcutsOpen: boolean;
  optionsOpen: boolean;
  sidebarCollapsed: boolean;
  keybindOverrides: Record<KeybindId, Combo>;
  passthroughPanes: string[];
  globalHotkey: string;
  autoRestart: { enabled: boolean; maxAttempts: number; backoffMs: number };
  logVisible: boolean;
  customThemeCSS: string;
  terminalScrollback: number;
  terminalBell: 'none' | 'visual' | 'sound';
  terminalCopyOnSelect: boolean;
  snippets: Array<{ name: string; command: string }>;
  customTools: Array<{ id: string; name: string; command: string; icon: string; color: string; description?: string }>;
  passthroughByDefault: boolean;
  shellProfiles: Record<string, { disabledShortcuts: string[]; passthroughByDefault: boolean }>;
  // Terminal
  terminalCursorStyle: CursorStyle;
  terminalCursorBlink: boolean;
  terminalFontLigatures: boolean;
  terminalLineHeight: number;
  terminalPadding: number;
  // Notifications
  notificationSound: boolean;
  notificationDesktop: boolean;
  // Performance
  terminalGpuAcceleration: boolean;
  terminalMaxRenderRate: number;
  // SSH
  sshConnections: SshConnection[];
  setTerminalScrollback: (size: number) => void;
  setTerminalBell: (bell: 'none' | 'visual' | 'sound') => void;
  setTerminalCopyOnSelect: (enabled: boolean) => void;
  addSnippet: (name: string, command: string) => void;
  removeSnippet: (index: number) => void;
  addCustomTool: (tool: { name: string; command: string; icon: string; color: string; description?: string }) => void;
  removeCustomTool: (id: string) => void;
  updateCustomTool: (id: string, updates: Partial<{ name: string; command: string; icon: string; color: string; description?: string }>) => void;
  setPassthroughByDefault: (enabled: boolean) => void;
  setShellProfile: (shellId: string, profile: { disabledShortcuts: string[]; passthroughByDefault: boolean }) => void;
  setTerminalCursorStyle: (style: CursorStyle) => void;
  setTerminalCursorBlink: (enabled: boolean) => void;
  setTerminalFontLigatures: (enabled: boolean) => void;
  setTerminalLineHeight: (height: number) => void;
  setTerminalPadding: (padding: number) => void;
  setNotificationSound: (enabled: boolean) => void;
  setNotificationDesktop: (enabled: boolean) => void;
  setTerminalGpuAcceleration: (enabled: boolean) => void;
  setTerminalMaxRenderRate: (fps: number) => void;
  addSshConnection: (conn: Omit<SshConnection, 'id'>) => void;
  removeSshConnection: (id: string) => void;
  updateSshConnection: (id: string, updates: Partial<SshConnection>) => void;
  setTheme: (themeId: ThemeId, mode: ThemeMode) => void;
  setThemeId: (themeId: ThemeId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (size: number) => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleShortcuts: () => void;
  setOptionsOpen: (open: boolean) => void;
  toggleOptions: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setKeybindOverride: (id: KeybindId, combo: Combo | null) => void;
  setKeybindOverrides: (overrides: Record<KeybindId, Combo>) => void;
  resetKeybinds: () => void;
  togglePassthrough: (paneId: string) => void;
  setPassthrough: (paneId: string, enabled: boolean) => void;
  setGlobalHotkey: (hotkey: string) => void;
  setAutoRestart: (next: Partial<SettingsStore['autoRestart']>) => void;
  setLogVisible: (visible: boolean) => void;
  toggleLog: () => void;
  setCustomThemeCSS: (css: string) => void;
  /** Pull persisted state from backend (SQLite) and merge with
   *  current in-memory state. Backend wins for keybind overrides +
   *  passthrough panes karena ini source of truth cross-device.
   *  Returns true kalau berhasil hydrate. */
  hydrateFromBackend: () => Promise<boolean>;
  /** One-time backfill: push localStorage-only overrides ke backend
   *  kalau SQLite `keybind_overrides` masih kosong. Dipanggil dari
   *  `useAppBootstrap` saat `hydrateFromBackend` return false (no
   *  SQLite data found). Return true kalau minimal satu override
   *  di-push. */
  migrateKeybindsFromLocalStorage: () => Promise<boolean>;
  /** Push in-memory keybind + passthrough state ke backend. Dipakai
   *  setelah user apply perubahan kalau backend belum ke-sync
   *  (mis. localStorage-only mode). */
  syncKeybindsToBackend: () => Promise<void>;
};

const STORAGE_KEY = 'Nonaterm:settings:v1';
const DEFAULT_THEME_ID: ThemeId = 'midnight';
const DEFAULT_MODE: ThemeMode = 'light';

type PersistedSettings = {
  themeMode?: ThemeMode;
  themeId?: ThemeId;
  fontFamily?: string;
  fontSize?: number;
  sidebarCollapsed?: boolean;
  keybindOverrides?: Record<KeybindId, Combo>;
  passthroughPanes?: string[];
  globalHotkey?: string;
  autoRestart?: { enabled?: boolean; maxAttempts?: number; backoffMs?: number };
  logVisible?: boolean;
  customThemeCSS?: string;
  terminalScrollback?: number;
  terminalBell?: 'none' | 'visual' | 'sound';
  terminalCopyOnSelect?: boolean;
  snippets?: Array<{ name: string; command: string }>;
  customTools?: Array<{ id: string; name: string; command: string; icon: string; color: string; description?: string }>;
  passthroughByDefault?: boolean;
  shellProfiles?: Record<string, { disabledShortcuts: string[]; passthroughByDefault: boolean }>;
  terminalCursorStyle?: CursorStyle;
  terminalCursorBlink?: boolean;
  terminalFontLigatures?: boolean;
  terminalLineHeight?: number;
  terminalPadding?: number;
  notificationSound?: boolean;
  notificationDesktop?: boolean;
  terminalGpuAcceleration?: boolean;
  terminalMaxRenderRate?: number;
  sshConnections?: SshConnection[];
};

function readPersisted(): PersistedSettings {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PersistedSettings;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePersisted(patch: PersistedSettings) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const current = readPersisted();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...patch }),
    );
  } catch {
    // localStorage may be disabled (private mode) — ignore silently
  }
}

function applyTheme(themeId: ThemeId, mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.themeId = themeId;
  const def = THEMES[themeId];
  if (def) {
    root.style.setProperty('--tw-accent', def.accent);
  }
}

const persisted = readPersisted();
const initialThemeId: ThemeId =
  persisted.themeId && THEMES[persisted.themeId]
    ? persisted.themeId
    : DEFAULT_THEME_ID;
const initialMode: ThemeMode = persisted.themeMode ?? DEFAULT_MODE;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  themeMode: initialMode,
  themeId: initialThemeId,
  fontFamily:
    persisted.fontFamily ?? 'Cascadia Code, ui-monospace, monospace',
  fontSize: persisted.fontSize ?? 13,
  shortcutsOpen: false,
  optionsOpen: false,
  sidebarCollapsed: persisted.sidebarCollapsed ?? false,
  keybindOverrides: persisted.keybindOverrides ?? {},
  passthroughPanes: persisted.passthroughPanes ?? [],
  globalHotkey: persisted.globalHotkey ?? '',
  autoRestart: {
    enabled: persisted.autoRestart?.enabled ?? true,
    maxAttempts: persisted.autoRestart?.maxAttempts ?? 3,
    backoffMs: persisted.autoRestart?.backoffMs ?? 1500,
  },
  logVisible: persisted.logVisible ?? true,
  customThemeCSS: persisted.customThemeCSS ?? '',
  terminalScrollback: 1000,
  terminalBell: 'none' as const,
  terminalCopyOnSelect: false,
  snippets: [] as Array<{ name: string; command: string }>,
  customTools: persisted.customTools ?? [] as Array<{ id: string; name: string; command: string; icon: string; color: string; description?: string }>,
  passthroughByDefault: persisted.passthroughByDefault ?? true,
  shellProfiles: {} as Record<string, { disabledShortcuts: string[]; passthroughByDefault: boolean }>,
  terminalCursorStyle: persisted.terminalCursorStyle ?? 'block',
  terminalCursorBlink: persisted.terminalCursorBlink ?? false,
  terminalFontLigatures: persisted.terminalFontLigatures ?? true,
  terminalLineHeight: persisted.terminalLineHeight ?? 1.2,
  terminalPadding: persisted.terminalPadding ?? 4,
  notificationSound: persisted.notificationSound ?? true,
  notificationDesktop: persisted.notificationDesktop ?? false,
  terminalGpuAcceleration: persisted.terminalGpuAcceleration ?? true,
  terminalMaxRenderRate: persisted.terminalMaxRenderRate ?? 60,
  sshConnections: persisted.sshConnections ?? [],
  setTheme: (themeId, mode) => {
    set({ themeId, themeMode: mode });
    applyTheme(themeId, mode);
    writePersisted({ themeId, themeMode: mode });
  },
  setThemeId: (themeId) => {
    set({ themeId });
    applyTheme(themeId, get().themeMode);
    writePersisted({ themeId });
  },
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    applyTheme(get().themeId, mode);
    writePersisted({ themeMode: mode });
  },
  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    writePersisted({ fontFamily });
  },
  setFontSize: (fontSize) => {
    const clamped = Math.max(10, Math.min(22, Math.round(fontSize)));
    set({ fontSize: clamped });
    writePersisted({ fontSize: clamped });
  },
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleShortcuts: () =>
    set((state) => ({ shortcutsOpen: !state.shortcutsOpen })),
  setOptionsOpen: (open) => set({ optionsOpen: open }),
  toggleOptions: () => set((state) => ({ optionsOpen: !state.optionsOpen })),
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    writePersisted({ sidebarCollapsed: collapsed });
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    writePersisted({ sidebarCollapsed: next });
  },
  setKeybindOverride: (id, combo) => {
    const current = { ...get().keybindOverrides };
    if (combo === null) {
      delete current[id];
    } else {
      current[id] = combo;
    }
    set({ keybindOverrides: current });
    writePersisted({ keybindOverrides: current });
    // Fire-and-forget backend sync. Gagal → tidak ganggu UI.
    if (combo === null) {
      keybindClearOverride(id).catch(() => {});
    } else {
      keybindSetOverride(
        id,
        combo.key,
        combo.ctrl ?? false,
        combo.shift ?? false,
        combo.alt ?? false,
        combo.meta ?? false,
      ).catch(() => {});
    }
  },
  setKeybindOverrides: (overrides) => {
    set({ keybindOverrides: overrides });
    writePersisted({ keybindOverrides: overrides });
    // Full re-sync — hapus semua lalu set yang sekarang. Cuma
    // dipanggil dari `hydrateFromBackend` (override) atau dari
    // eksplisit "Reset all" di UI.
    keybindClearAllOverrides()
      .then(async () => {
        for (const [id, combo] of Object.entries(overrides)) {
          await keybindSetOverride(
            id,
            combo.key,
            combo.ctrl ?? false,
            combo.shift ?? false,
            combo.alt ?? false,
            combo.meta ?? false,
          );
        }
      })
      .catch(() => {});
  },
  resetKeybinds: () => {
    set({ keybindOverrides: {} });
    writePersisted({ keybindOverrides: {} });
    keybindClearAllOverrides().catch(() => {});
  },
  togglePassthrough: (paneId) => {
    const current = get().passthroughPanes;
    const willEnable = !current.includes(paneId);
    const next = willEnable
      ? [...current, paneId]
      : current.filter((id) => id !== paneId);
    set({ passthroughPanes: next });
    writePersisted({ passthroughPanes: next });
    paneSetPassthrough(paneId, willEnable).catch(() => {});
  },
  setPassthrough: (paneId, enabled) => {
    const current = get().passthroughPanes;
    const next = enabled
      ? current.includes(paneId)
        ? current
        : [...current, paneId]
      : current.filter((id) => id !== paneId);
    set({ passthroughPanes: next });
    writePersisted({ passthroughPanes: next });
    paneSetPassthrough(paneId, enabled).catch(() => {});
  },
  setGlobalHotkey: (hotkey) => {
    set({ globalHotkey: hotkey });
    writePersisted({ globalHotkey: hotkey });
    // TODO: Call backend to register/unregister global shortcut
  },
  setAutoRestart: (patch) => {
    const current = get().autoRestart;
    const next = { ...current, ...patch };
    set({ autoRestart: next });
    writePersisted({ autoRestart: next });
  },
  setLogVisible: (visible) => {
    set({ logVisible: visible });
    writePersisted({ logVisible: visible });
  },
  toggleLog: () => {
    const next = !get().logVisible;
    set({ logVisible: next });
    writePersisted({ logVisible: next });
  },
  setCustomThemeCSS: (css) => {
    set({ customThemeCSS: css });
    writePersisted({ customThemeCSS: css });
  },
  setTerminalScrollback: (size) => {
    set({ terminalScrollback: size });
    writePersisted({ terminalScrollback: size });
  },
  setTerminalBell: (bell) => {
    set({ terminalBell: bell });
    writePersisted({ terminalBell: bell });
  },
  setTerminalCopyOnSelect: (enabled) => {
    set({ terminalCopyOnSelect: enabled });
    writePersisted({ terminalCopyOnSelect: enabled });
  },
  addSnippet: (name, command) => {
    const next = [...get().snippets, { name, command }];
    set({ snippets: next });
    writePersisted({ snippets: next });
  },
  removeSnippet: (index) => {
    const next = get().snippets.filter((_, i) => i !== index);
    set({ snippets: next });
    writePersisted({ snippets: next });
  },
  addCustomTool: (tool) => {
    const id = crypto.randomUUID();
    const newTool = { id, ...tool };
    const next = [...get().customTools, newTool];
    set({ customTools: next });
    writePersisted({ customTools: next });
  },
  removeCustomTool: (id) => {
    const next = get().customTools.filter((t) => t.id !== id);
    set({ customTools: next });
    writePersisted({ customTools: next });
  },
  updateCustomTool: (id, updates) => {
    const next = get().customTools.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ customTools: next });
    writePersisted({ customTools: next });
  },
  setPassthroughByDefault: (enabled) => {
    set({ passthroughByDefault: enabled });
    writePersisted({ passthroughByDefault: enabled });
  },
  setShellProfile: (shellId, profile) => {
    const next = { ...get().shellProfiles, [shellId]: profile };
    set({ shellProfiles: next });
    writePersisted({ shellProfiles: next });
  },
  setTerminalCursorStyle: (style) => {
    set({ terminalCursorStyle: style });
    writePersisted({ terminalCursorStyle: style });
  },
  setTerminalCursorBlink: (enabled) => {
    set({ terminalCursorBlink: enabled });
    writePersisted({ terminalCursorBlink: enabled });
  },
  setTerminalFontLigatures: (enabled) => {
    set({ terminalFontLigatures: enabled });
    writePersisted({ terminalFontLigatures: enabled });
  },
  setTerminalLineHeight: (height) => {
    const clamped = Math.max(1.0, Math.min(2.0, height));
    set({ terminalLineHeight: clamped });
    writePersisted({ terminalLineHeight: clamped });
  },
  setTerminalPadding: (padding) => {
    const clamped = Math.max(0, Math.min(20, padding));
    set({ terminalPadding: clamped });
    writePersisted({ terminalPadding: clamped });
  },
  setNotificationSound: (enabled) => {
    set({ notificationSound: enabled });
    writePersisted({ notificationSound: enabled });
  },
  setNotificationDesktop: (enabled) => {
    set({ notificationDesktop: enabled });
    writePersisted({ notificationDesktop: enabled });
  },
  setTerminalGpuAcceleration: (enabled) => {
    set({ terminalGpuAcceleration: enabled });
    writePersisted({ terminalGpuAcceleration: enabled });
  },
  setTerminalMaxRenderRate: (fps) => {
    const clamped = Math.max(15, Math.min(120, fps));
    set({ terminalMaxRenderRate: clamped });
    writePersisted({ terminalMaxRenderRate: clamped });
  },
  addSshConnection: (conn) => {
    const id = crypto.randomUUID();
    const next = [...get().sshConnections, { id, ...conn }];
    set({ sshConnections: next });
    writePersisted({ sshConnections: next });
  },
  removeSshConnection: (id) => {
    const next = get().sshConnections.filter((c) => c.id !== id);
    set({ sshConnections: next });
    writePersisted({ sshConnections: next });
  },
  updateSshConnection: (id, updates) => {
    const next = get().sshConnections.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    set({ sshConnections: next });
    writePersisted({ sshConnections: next });
  },
  hydrateFromBackend: async () => {
    // Best-effort. Kalau backend tidak reachable (mis. di test
    // environment tanpa Tauri runtime), swallow error dan keep
    // localStorage state.
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return false;
    }
    try {
      const [overrides, passthrough] = await Promise.all([
        keybindGetOverrides(),
        paneGetPassthroughList(),
      ]);
      const keybindMap: Record<KeybindId, Combo> = {};
      for (const row of overrides) {
        keybindMap[row.keybindId] = {
          key: row.key,
          ctrl: row.ctrl,
          shift: row.shift,
          alt: row.alt,
          meta: row.meta,
        };
      }
      const paneIds = passthrough.map((entry) => entry.paneId);
      set({ keybindOverrides: keybindMap, passthroughPanes: paneIds });
      // Mirror to localStorage so offline boot still works.
      writePersisted({ keybindOverrides: keybindMap, passthroughPanes: paneIds });
      return true;
    } catch (error) {
      console.warn('[settings] hydrate from backend failed:', error);
      return false;
    }
  },
  migrateKeybindsFromLocalStorage: async () => {
    const overrides = get().keybindOverrides;
    const entries = Object.entries(overrides);
    if (entries.length === 0) {
      return false;
    }
    try {
      await keybindClearAllOverrides();
      let pushed = 0;
      for (const [id, combo] of entries) {
        await keybindSetOverride(
          id,
          combo.key,
          combo.ctrl ?? false,
          combo.shift ?? false,
          combo.alt ?? false,
          combo.meta ?? false,
        );
        pushed += 1;
      }
      return pushed > 0;
    } catch (error) {
      console.warn('[settings] migrate keybinds from localStorage failed:', error);
      return false;
    }
  },
  syncKeybindsToBackend: async () => {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return;
    }
    const state = get();
    try {
      // Reset backend ke state saat ini: clear all, then re-insert.
      await keybindClearAllOverrides();
      for (const [id, combo] of Object.entries(state.keybindOverrides)) {
        try {
          await keybindSetOverride(
            id,
            combo.key,
            combo.ctrl ?? false,
            combo.shift ?? false,
            combo.alt ?? false,
            combo.meta ?? false,
          );
        } catch {
          // Skip individual failures — best effort sync.
        }
      }
      // Passthrough: backend is set-based, so remove all then add.
      // Untuk simplicity, kita set setiap pane di list. Pane yang
      // ada di backend tapi tidak di list akan di-clear by not
      // being touched — caller bisa pakai paneGetPassthroughList
      // + diff kalau perlu. Untuk MVP, kita hanya push current.
      for (const paneId of state.passthroughPanes) {
        try {
          await paneSetPassthrough(paneId, true);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.warn('[settings] sync to backend failed:', error);
    }
  },
}));

if (typeof document !== 'undefined') {
  applyTheme(initialThemeId, initialMode);
}
