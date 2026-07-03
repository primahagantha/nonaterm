import { act } from 'react';
import { vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

const { keybindSetOverrideMock, keybindClearOverrideMock, keybindClearAllOverridesMock, paneSetPassthroughMock, keybindGetOverridesMock, paneGetPassthroughListMock } = vi.hoisted(() => ({
  keybindSetOverrideMock: vi.fn(),
  keybindClearOverrideMock: vi.fn(),
  keybindClearAllOverridesMock: vi.fn(),
  paneSetPassthroughMock: vi.fn(),
  keybindGetOverridesMock: vi.fn(),
  paneGetPassthroughListMock: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  keybindSetOverride: keybindSetOverrideMock,
  keybindClearOverride: keybindClearOverrideMock,
  keybindClearAllOverrides: keybindClearAllOverridesMock,
  paneSetPassthrough: paneSetPassthroughMock,
  keybindGetOverrides: keybindGetOverridesMock,
  paneGetPassthroughList: paneGetPassthroughListMock,
}));

describe('settingsStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.setState({
      themeMode: 'light',
      themeId: 'midnight',
      fontFamily: 'Cascadia Code, ui-monospace, monospace',
      fontSize: 13,
      shortcutsOpen: false,
      optionsOpen: false,
      sidebarCollapsed: false,
    });
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.themeId = 'midnight';
    keybindSetOverrideMock.mockReset();
    keybindClearOverrideMock.mockReset();
    keybindClearAllOverridesMock.mockReset();
    paneSetPassthroughMock.mockReset();
    keybindGetOverridesMock.mockReset();
    paneGetPassthroughListMock.mockReset();
  });

  it('defaults to light mode with midnight theme and applies it to the document', () => {
    act(() => {
      useSettingsStore.getState().setThemeMode('light');
    });
    expect(useSettingsStore.getState().themeMode).toBe('light');
    expect(useSettingsStore.getState().themeId).toBe('midnight');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.themeId).toBe('midnight');
  });

  it('switches theme and mode and persists both to localStorage', () => {
    act(() => {
      useSettingsStore.getState().setTheme('aurora', 'dark');
    });
    expect(useSettingsStore.getState().themeId).toBe('aurora');
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.themeId).toBe('aurora');
    const stored = window.localStorage.getItem('Nonaterm:settings:v1');
    expect(stored).toContain('"themeId":"aurora"');
    expect(stored).toContain('"themeMode":"dark"');
  });

  it('setThemeMode only flips light/dark without changing the theme', () => {
    act(() => {
      useSettingsStore.getState().setThemeMode('dark');
    });
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    expect(useSettingsStore.getState().themeId).toBe('midnight');
  });

  it('setFontSize clamps out-of-range values', () => {
    act(() => {
      useSettingsStore.getState().setFontSize(99);
    });
    expect(useSettingsStore.getState().fontSize).toBe(22);
    act(() => {
      useSettingsStore.getState().setFontSize(1);
    });
    expect(useSettingsStore.getState().fontSize).toBe(10);
  });

  it('persists fontFamily and fontSize updates', () => {
    act(() => {
      useSettingsStore
        .getState()
        .setFontFamily('"JetBrains Mono", "Fira Code", monospace');
      useSettingsStore.getState().setFontSize(15);
    });
    expect(useSettingsStore.getState().fontFamily).toContain('JetBrains');
    expect(useSettingsStore.getState().fontSize).toBe(15);
    const stored = window.localStorage.getItem('Nonaterm:settings:v1');
    expect(stored).toContain('JetBrains');
    expect(stored).toContain('"fontSize":15');
  });

  it('toggles sidebar and persists collapsed state', () => {
    act(() => {
      useSettingsStore.getState().toggleSidebar();
    });
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);
    expect(window.localStorage.getItem('Nonaterm:settings:v1')).toContain(
      '"sidebarCollapsed":true',
    );
  });

  it('opens and closes shortcuts and options panels independently', () => {
    act(() => {
      useSettingsStore.getState().setShortcutsOpen(true);
      useSettingsStore.getState().setOptionsOpen(true);
    });
    expect(useSettingsStore.getState().shortcutsOpen).toBe(true);
    expect(useSettingsStore.getState().optionsOpen).toBe(true);
    act(() => {
      useSettingsStore.getState().setShortcutsOpen(false);
    });
    expect(useSettingsStore.getState().shortcutsOpen).toBe(false);
    expect(useSettingsStore.getState().optionsOpen).toBe(true);
  });
});

describe('settingsStore keybind backend sync', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.setState({
      themeMode: 'light',
      themeId: 'midnight',
      fontFamily: 'Cascadia Code, ui-monospace, monospace',
      fontSize: 13,
      shortcutsOpen: false,
      optionsOpen: false,
      sidebarCollapsed: false,
      keybindOverrides: {},
      passthroughPanes: [],
    });
    keybindSetOverrideMock.mockReset();
    keybindClearOverrideMock.mockReset();
    keybindClearAllOverridesMock.mockReset();
    paneSetPassthroughMock.mockReset();
    keybindGetOverridesMock.mockReset();
    paneGetPassthroughListMock.mockReset();
  });

  it('setKeybindOverride fires backend set and persists to localStorage', async () => {
    keybindSetOverrideMock.mockResolvedValue({
      overrideRow: { keybindId: 'k1' },
      conflicts: [],
    });

    await act(async () => {
      useSettingsStore.getState().setKeybindOverride('k1', {
        key: 'p',
        ctrl: true,
        shift: true,
      });
    });

    expect(keybindSetOverrideMock).toHaveBeenCalledWith(
      'k1',
      'p',
      true,
      true,
      false,
      false,
    );
    expect(useSettingsStore.getState().keybindOverrides.k1).toEqual({
      key: 'p',
      ctrl: true,
      shift: true,
    });
  });

  it('setKeybindOverride(null) fires backend clear', async () => {
    keybindClearAllOverridesMock.mockResolvedValue(0);
    keybindClearOverrideMock.mockResolvedValue(true);

    await act(async () => {
      useSettingsStore.getState().setKeybindOverrides({
        k1: { key: 'p', ctrl: true },
      });
    });
    expect(keybindClearAllOverridesMock).toHaveBeenCalled();

    await act(async () => {
      useSettingsStore.getState().setKeybindOverride('k1', null);
    });

    expect(keybindClearOverrideMock).toHaveBeenCalledWith('k1');
    expect(useSettingsStore.getState().keybindOverrides.k1).toBeUndefined();
  });

  it('resetKeybinds clears local + backend', async () => {
    keybindClearAllOverridesMock.mockResolvedValue(1);

    await act(async () => {
      useSettingsStore.getState().resetKeybinds();
    });

    expect(keybindClearAllOverridesMock).toHaveBeenCalled();
    expect(useSettingsStore.getState().keybindOverrides).toEqual({});
  });

  it('togglePassthrough updates list and calls backend', async () => {
    paneSetPassthroughMock.mockResolvedValue(undefined);

    await act(async () => {
      useSettingsStore.getState().togglePassthrough('pane-1');
    });
    expect(paneSetPassthroughMock).toHaveBeenCalledWith('pane-1', true);
    expect(useSettingsStore.getState().passthroughPanes).toContain('pane-1');

    paneSetPassthroughMock.mockClear();
    await act(async () => {
      useSettingsStore.getState().togglePassthrough('pane-1');
    });
    expect(paneSetPassthroughMock).toHaveBeenCalledWith('pane-1', false);
    expect(useSettingsStore.getState().passthroughPanes).not.toContain(
      'pane-1',
    );
  });
});

describe('settingsStore hydrateFromBackend', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.setState({
      themeMode: 'light',
      themeId: 'midnight',
      shortcutsOpen: false,
      optionsOpen: false,
      sidebarCollapsed: false,
      keybindOverrides: {},
      passthroughPanes: [],
    });
    keybindGetOverridesMock.mockReset();
    paneGetPassthroughListMock.mockReset();
    // JSDOM tidak punya Tauri runtime → hydrate harus return false.
  });

  it('returns false when not in Tauri runtime', async () => {
    const result = await useSettingsStore.getState().hydrateFromBackend();
    expect(result).toBe(false);
    expect(keybindGetOverridesMock).not.toHaveBeenCalled();
  });
});

describe('settingsStore migrateKeybindsFromLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.setState({
      themeMode: 'light',
      themeId: 'midnight',
      shortcutsOpen: false,
      optionsOpen: false,
      sidebarCollapsed: false,
      keybindOverrides: {},
      passthroughPanes: [],
    });
    keybindSetOverrideMock.mockReset();
    keybindClearAllOverridesMock.mockReset();
  });

  it('migrateKeybindsFromLocalStorage_pushed_overrides_when_backend_empty', async () => {
    keybindClearAllOverridesMock.mockResolvedValue(0);
    keybindSetOverrideMock.mockResolvedValue({
      overrideRow: { keybindId: 'k1' },
      conflicts: [],
    });

    useSettingsStore.setState({
      keybindOverrides: {
        k1: { key: 'p', ctrl: true, shift: true, alt: false, meta: false },
        k2: { key: 'n', ctrl: true, shift: false, alt: true, meta: false },
      },
    });

    const result = await useSettingsStore
      .getState()
      .migrateKeybindsFromLocalStorage();

    expect(result).toBe(true);
    expect(keybindClearAllOverridesMock).toHaveBeenCalledTimes(1);
    expect(keybindSetOverrideMock).toHaveBeenCalledTimes(2);
    expect(keybindSetOverrideMock).toHaveBeenCalledWith(
      'k1',
      'p',
      true,
      true,
      false,
      false,
    );
    expect(keybindSetOverrideMock).toHaveBeenCalledWith(
      'k2',
      'n',
      true,
      false,
      true,
      false,
    );
  });

  it('migrateKeybindsFromLocalStorage_noop_when_no_overrides', async () => {
    const result = await useSettingsStore
      .getState()
      .migrateKeybindsFromLocalStorage();

    expect(result).toBe(false);
    expect(keybindClearAllOverridesMock).not.toHaveBeenCalled();
    expect(keybindSetOverrideMock).not.toHaveBeenCalled();
  });
});
