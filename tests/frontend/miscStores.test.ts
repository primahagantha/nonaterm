import { useSettingsStore } from '@/stores/settingsStore';
import { useTerminalStore } from '@/stores/terminalStore';

describe('misc skeleton stores', () => {
  it('exposes light theme defaults for settings store', () => {
    expect(useSettingsStore.getState().themeMode).toBe('light');
    expect(useSettingsStore.getState().fontFamily).toContain('Cascadia Code');
  });

  it('starts terminal store with no tracked sessions', () => {
    expect(useTerminalStore.getState().sessions).toEqual({});
  });

  it('tracks terminal session lifecycle transitions', () => {
    useTerminalStore.getState().startSession('pane-1', 'workspace-1');
    useTerminalStore.getState().attachSession('pane-1', {
      workspaceId: 'workspace-1',
      isConnected: true,
      status: 'running',
      sessionId: 'session-1',
    });
    useTerminalStore.getState().markOutput('pane-1');
    useTerminalStore.getState().markExited('pane-1', 0);

    const session = useTerminalStore.getState().sessions['pane-1'];
    expect(session.status).toBe('exited');
    expect(session.exitCode).toBe(0);
    expect(session.lastOutputAt).toBeDefined();

    useTerminalStore.getState().removeSession('pane-1');
    expect(useTerminalStore.getState().sessions['pane-1']).toBeUndefined();
  });
});
