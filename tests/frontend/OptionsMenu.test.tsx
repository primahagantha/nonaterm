import { render, screen, fireEvent, act } from '@testing-library/react';

const { stateExportConfigMock, stateImportConfigMock, stateSaveSnapshotMock } = vi.hoisted(() => ({
  stateExportConfigMock: vi.fn(),
  stateImportConfigMock: vi.fn(),
  stateSaveSnapshotMock: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  stateExportConfig: stateExportConfigMock,
  stateImportConfig: stateImportConfigMock,
  stateSaveSnapshot: stateSaveSnapshotMock,
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: { appInfo: null; diagnostics: null; backendStatus: string }) => unknown) =>
    selector({ appInfo: null, diagnostics: null, backendStatus: 'ready' }),
}));

import { OptionsMenu } from '@/components/shell/OptionsMenu';
import { useSettingsStore } from '@/stores/settingsStore';

describe('OptionsMenu', () => {
  beforeEach(() => {
    stateExportConfigMock.mockReset();
    stateImportConfigMock.mockReset();
    stateSaveSnapshotMock.mockReset();
    useSettingsStore.setState({
      optionsOpen: false,
      themeMode: 'light',
      themeId: 'midnight',
      fontFamily: 'Cascadia Code, ui-monospace, monospace',
    });
  });

  it('opens the panel when trigger is clicked', () => {
    render(<OptionsMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open options menu/i }));
    expect(useSettingsStore.getState().optionsOpen).toBe(true);
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
  });

  it('toggles theme via theme cards', () => {
    render(<OptionsMenu />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    const dracula = screen.getByRole('radio', { name: /dracula/i });
    fireEvent.click(dracula);
    expect(useSettingsStore.getState().themeId).toBe('dracula');
  });

  it('exports config and reports success', async () => {
    stateExportConfigMock.mockResolvedValue({
      version: '1',
      exportedAt: 'now',
      activeWorkspaceId: 'a',
      workspaces: [],
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    render(<OptionsMenu />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    const configTab = screen.getByRole('tab', { name: /config/i });
    fireEvent.click(configTab);
    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);
    await act(async () => {
      await Promise.resolve();
    });
    expect(stateExportConfigMock).toHaveBeenCalled();
  });
});
