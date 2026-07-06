import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';

const { stateExportConfigMock, stateImportConfigMock, stateSaveSnapshotMock } = vi.hoisted(() => ({
  stateExportConfigMock: vi.fn(),
  stateImportConfigMock: vi.fn(),
  stateSaveSnapshotMock: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  stateExportConfig: stateExportConfigMock,
  stateImportConfig: stateImportConfigMock,
  stateSaveSnapshot: stateSaveSnapshotMock,
  isTauriRuntime: () => false,
  systemRegisterGlobalHotkey: vi.fn(),
  systemUnregisterGlobalHotkey: vi.fn(),
  templatesList: vi.fn().mockResolvedValue([]),
  templatesMaterialize: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: { appInfo: null; diagnostics: null; backendStatus: string }) => unknown) =>
    selector({ appInfo: null, diagnostics: null, backendStatus: 'ready' }),
}));

import { SettingsPage } from '@/components/shell/SettingsPage';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function openSettings() {
  act(() => {
    useSettingsStore.getState().setOptionsOpen(true);
  });
}

describe('SettingsPage config section', () => {
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
    useWorkspaceStore.setState({
      activeWorkspaceId: 'ws-1',
      workspaces: [],
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls stateExportConfig on export button click', async () => {
    stateExportConfigMock.mockResolvedValue({
      version: '0.1.0',
      exportedAt: '2026-06-19T00:00:00.000Z',
      activeWorkspaceId: 'ws-1',
      workspaces: [],
    });

    render(<SettingsPage />);
    openSettings();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));

    fireEvent.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(stateExportConfigMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows inline error message on export failure', async () => {
    stateExportConfigMock.mockRejectedValue(new Error('export failed'));

    render(<SettingsPage />);
    openSettings();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));
    fireEvent.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(screen.getByText('export failed')).toBeInTheDocument();
    });
  });

  it('saves snapshot on demand', async () => {
    stateSaveSnapshotMock.mockResolvedValue(undefined);

    render(<SettingsPage />);
    openSettings();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));
    fireEvent.click(screen.getByRole('button', { name: /save snapshot/i }));

    await waitFor(() => {
      expect(stateSaveSnapshotMock).toHaveBeenCalledTimes(1);
    });
  });
});
