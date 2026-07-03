import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

// Test the store operations directly
describe('Snippet Library Store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ snippets: [] });
  });

  it('has snippets field in store', () => {
    expect(useSettingsStore.getState().snippets).toBeDefined();
    expect(Array.isArray(useSettingsStore.getState().snippets)).toBe(true);
  });

  it('addSnippet adds a snippet', () => {
    useSettingsStore.getState().addSnippet('Test', 'echo hello');
    const snippets = useSettingsStore.getState().snippets;
    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toEqual({ name: 'Test', command: 'echo hello' });
  });

  it('addSnippet adds multiple snippets', () => {
    useSettingsStore.getState().addSnippet('Test 1', 'echo 1');
    useSettingsStore.getState().addSnippet('Test 2', 'echo 2');
    expect(useSettingsStore.getState().snippets).toHaveLength(2);
  });

  it('removeSnippet removes by index', () => {
    useSettingsStore.getState().addSnippet('Test 1', 'echo 1');
    useSettingsStore.getState().addSnippet('Test 2', 'echo 2');
    useSettingsStore.getState().removeSnippet(0);
    const snippets = useSettingsStore.getState().snippets;
    expect(snippets).toHaveLength(1);
    expect(snippets[0].name).toBe('Test 2');
  });

  it('snippets persists to localStorage', () => {
    useSettingsStore.getState().addSnippet('Persist', 'echo persist');
    const stored = JSON.parse(localStorage.getItem('Nonaterm:settings:v1') || '{}');
    expect(stored.snippets).toHaveLength(1);
    expect(stored.snippets[0].name).toBe('Persist');
  });
});
