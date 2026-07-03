import { act } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

describe('autoRestart policy', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      autoRestart: {
        enabled: true,
        maxAttempts: 3,
        backoffMs: 1500,
      },
    });
  });

  it('defaults to enabled with 3 attempts and 1500ms backoff', () => {
    const policy = useSettingsStore.getState().autoRestart;
    expect(policy.enabled).toBe(true);
    expect(policy.maxAttempts).toBe(3);
    expect(policy.backoffMs).toBe(1500);
  });

  it('partial update via setAutoRestart merges with previous state', () => {
    act(() => {
      useSettingsStore.getState().setAutoRestart({ maxAttempts: 7 });
    });
    const policy = useSettingsStore.getState().autoRestart;
    expect(policy.enabled).toBe(true);
    expect(policy.maxAttempts).toBe(7);
    expect(policy.backoffMs).toBe(1500);

    act(() => {
      useSettingsStore.getState().setAutoRestart({ enabled: false });
    });
    expect(useSettingsStore.getState().autoRestart.enabled).toBe(false);
    expect(useSettingsStore.getState().autoRestart.maxAttempts).toBe(7);
  });
});
