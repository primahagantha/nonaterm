import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

describe('Global Hotkey Settings', () => {
  beforeEach(() => {
    useSettingsStore.setState({ globalHotkey: '' });
  });

  it('has globalHotkey field in store', () => {
    expect(useSettingsStore.getState().globalHotkey).toBeDefined();
  });

  it('default globalHotkey is empty string', () => {
    expect(useSettingsStore.getState().globalHotkey).toBe('');
  });

  it('setGlobalHotkey updates the value', () => {
    useSettingsStore.getState().setGlobalHotkey('Ctrl+Shift+`');
    expect(useSettingsStore.getState().globalHotkey).toBe('Ctrl+Shift+`');
  });

  it('setGlobalHotkey with empty string clears the hotkey', () => {
    useSettingsStore.setState({ globalHotkey: 'Ctrl+Shift+`' });
    useSettingsStore.getState().setGlobalHotkey('');
    expect(useSettingsStore.getState().globalHotkey).toBe('');
  });

  it('globalHotkey persists to localStorage', () => {
    useSettingsStore.getState().setGlobalHotkey('Alt+`');
    const stored = JSON.parse(localStorage.getItem('Nonaterm:settings:v1') || '{}');
    expect(stored.globalHotkey).toBe('Alt+`');
  });
});
