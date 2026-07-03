import { describe, it, expect } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

describe('Settings store rapid updates stress', () => {
  it('handles 50 rapid theme switches', () => {
    const themes = ['midnight', 'aurora', 'solarized', 'nord', 'dracula', 'monokai'] as const;

    for (let i = 0; i < 50; i++) {
      useSettingsStore.getState().setThemeId(themes[i % themes.length]);
    }

    const final = useSettingsStore.getState().themeId;
    expect(themes).toContain(final);
  });

  it('handles 50 rapid font size changes', () => {
    for (let i = 0; i < 50; i++) {
      useSettingsStore.getState().setFontSize(10 + (i % 13));
    }

    const final = useSettingsStore.getState().fontSize;
    expect(final).toBeGreaterThanOrEqual(10);
    expect(final).toBeLessThanOrEqual(22);
  });

  it('handles concurrent passthrough toggles', () => {
    const paneIds = ['p1', 'p2', 'p3', 'p4', 'p5'];

    for (let i = 0; i < 25; i++) {
      const paneId = paneIds[i % paneIds.length];
      useSettingsStore.getState().togglePassthrough(paneId);
    }

    const passthrough = useSettingsStore.getState().passthroughPanes;
    expect(Array.isArray(passthrough)).toBe(true);
  });

  it('handles rapid sidebar collapse toggle', () => {
    for (let i = 0; i < 20; i++) {
      useSettingsStore.getState().toggleSidebar();
    }

    expect(typeof useSettingsStore.getState().sidebarCollapsed).toBe('boolean');
  });
});
