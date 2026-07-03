import { render, fireEvent } from '@testing-library/react';
import { AppShell } from '@/components/shell/AppShell';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

vi.mock('@/hooks/useAppBootstrap', () => ({
  useAppBootstrap: vi.fn(),
}));

vi.mock('@/components/terminal/TerminalGrid', () => ({
  TerminalGrid: () => <div data-testid="terminal-grid-stub" />,
}));

vi.mock('@/components/shell/UpdateChecker', () => ({
  UpdateChecker: () => null,
}));

vi.mock('@/components/shell/LogViewer', () => ({
  LogViewer: () => null,
}));

vi.mock('@/components/shell/TerminalLauncher', () => ({
  TerminalLauncher: () => null,
}));

describe('AppShell keybindings', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      shortcutsOpen: false,
      optionsOpen: false,
      themeMode: 'light',
      themeId: 'midnight',
    });
    useWorkspaceStore.setState({
      activeWorkspaceId: 'w1',
      workspaces: [
        { id: 'w1', name: 'A', accentColor: '#000', layoutPreset: '1', panes: [] },
        { id: 'w2', name: 'B', accentColor: '#000', layoutPreset: '1', panes: [] },
        { id: 'w3', name: 'C', accentColor: '#000', layoutPreset: '1', panes: [] },
      ],
    });
  });

  it('Ctrl+. opens the shortcuts modal', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: '.', ctrlKey: true });
    expect(useSettingsStore.getState().shortcutsOpen).toBe(true);
  });

  it('Ctrl+, opens the options menu', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    expect(useSettingsStore.getState().optionsOpen).toBe(true);
  });

  it('Alt+2 switches to the second workspace', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: '2', altKey: true });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('w2');
  });

  it('Esc closes both shortcuts and options', () => {
    useSettingsStore.setState({ shortcutsOpen: true, optionsOpen: true });
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useSettingsStore.getState().shortcutsOpen).toBe(false);
    expect(useSettingsStore.getState().optionsOpen).toBe(false);
  });
});
