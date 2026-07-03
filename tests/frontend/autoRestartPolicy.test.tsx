import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

describe('Auto-Restart Configurable Policy', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      autoRestart: {
        enabled: true,
        maxAttempts: 3,
        backoffMs: 1500,
      },
    });
  });

  it('has autoRestart field in store', () => {
    const state = useSettingsStore.getState();
    expect(state.autoRestart).toBeDefined();
    expect(state.autoRestart.enabled).toBe(true);
    expect(state.autoRestart.maxAttempts).toBe(3);
    expect(state.autoRestart.backoffMs).toBe(1500);
  });

  it('setAutoRestart updates enabled', () => {
    useSettingsStore.getState().setAutoRestart({ enabled: false });
    expect(useSettingsStore.getState().autoRestart.enabled).toBe(false);
  });

  it('setAutoRestart updates maxAttempts', () => {
    useSettingsStore.getState().setAutoRestart({ maxAttempts: 5 });
    expect(useSettingsStore.getState().autoRestart.maxAttempts).toBe(5);
  });

  it('setAutoRestart updates backoffMs', () => {
    useSettingsStore.getState().setAutoRestart({ backoffMs: 2000 });
    expect(useSettingsStore.getState().autoRestart.backoffMs).toBe(2000);
  });

  it('setAutoRestart merges with existing values', () => {
    useSettingsStore.getState().setAutoRestart({ maxAttempts: 10 });
    const state = useSettingsStore.getState();
    expect(state.autoRestart.maxAttempts).toBe(10);
    expect(state.autoRestart.enabled).toBe(true); // unchanged
    expect(state.autoRestart.backoffMs).toBe(1500); // unchanged
  });

  it('autoRestart persists to localStorage', () => {
    useSettingsStore.getState().setAutoRestart({ maxAttempts: 7 });
    const stored = JSON.parse(localStorage.getItem('Nonaterm:settings:v1') || '{}');
    expect(stored.autoRestart?.maxAttempts).toBe(7);
  });
});
