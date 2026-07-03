import { useUiStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('tracks app info and backend status', () => {
    useUiStore.getState().setAppInfo({
      name: 'Nonaterm',
      version: '0.1.0',
      platform: 'windows',
    });
    useUiStore.getState().setBackendStatus('ready');

    expect(useUiStore.getState().appInfo?.name).toBe('Nonaterm');
    expect(useUiStore.getState().backendStatus).toBe('ready');
  });

  it('resets transient state to initial values', () => {
    useUiStore.getState().setBackendStatus('error', 'failed');
    useUiStore.getState().reset();

    expect(useUiStore.getState().backendStatus).toBe('idle');
    expect(useUiStore.getState().bootstrapError).toBeNull();
  });
});
