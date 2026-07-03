import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('Grid Resize Manual', () => {
  beforeEach(() => {
    useUiStore.setState({ paneSizes: {} });
  });

  it('has paneSizes field in store', () => {
    expect(useUiStore.getState().paneSizes).toBeDefined();
    expect(typeof useUiStore.getState().paneSizes).toBe('object');
  });

  it('setPaneSize updates column ratio', () => {
    useUiStore.getState().setPaneSize('ws-1', 'columns', 0, 0.6);
    const sizes = useUiStore.getState().paneSizes['ws-1'];
    expect(sizes.columns[0]).toBe(0.6);
  });

  it('setPaneSize updates row ratio', () => {
    useUiStore.getState().setPaneSize('ws-1', 'rows', 0, 0.4);
    const sizes = useUiStore.getState().paneSizes['ws-1'];
    expect(sizes.rows[0]).toBe(0.4);
  });

  it('setPaneSize preserves other ratios', () => {
    useUiStore.getState().setPaneSize('ws-1', 'columns', 0, 0.6);
    useUiStore.getState().setPaneSize('ws-1', 'columns', 1, 0.3);
    const sizes = useUiStore.getState().paneSizes['ws-1'];
    expect(sizes.columns[0]).toBe(0.6);
    expect(sizes.columns[1]).toBe(0.3);
  });

  it('setPaneSize works for different workspaces', () => {
    useUiStore.getState().setPaneSize('ws-1', 'columns', 0, 0.6);
    useUiStore.getState().setPaneSize('ws-2', 'columns', 0, 0.4);
    expect(useUiStore.getState().paneSizes['ws-1'].columns[0]).toBe(0.6);
    expect(useUiStore.getState().paneSizes['ws-2'].columns[0]).toBe(0.4);
  });
});
