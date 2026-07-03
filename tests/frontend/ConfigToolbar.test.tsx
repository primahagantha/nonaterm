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
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: { appInfo: null; diagnostics: null; backendStatus: string }) => unknown) =>
    selector({ appInfo: null, diagnostics: null, backendStatus: 'ready' }),
}));

import { ConfigToolbar } from '@/components/shell/ConfigToolbar';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function openOptionsMenu() {
  act(() => {
    useSettingsStore.getState().setOptionsOpen(true);
  });
}

describe('ConfigToolbar (re-export of OptionsMenu)', () => {
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

    render(<ConfigToolbar />);
    openOptionsMenu();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));

    fireEvent.click(screen.getByRole('button', { name: /^export/i }));

    await waitFor(() => {
      expect(stateExportConfigMock).toHaveBeenCalledTimes(1);
    });
  });

  it('reads file and calls stateImportConfig on import', async () => {
    const configJson = JSON.stringify({
      version: '0.1.0',
      exportedAt: '2026-06-19T00:00:00.000Z',
      activeWorkspaceId: 'ws-imported',
      workspaces: [
        {
          id: 'ws-imported',
          name: 'Imported',
          accentColor: '#ff0000',
          layoutPreset: '1',
          panes: [
            { id: 'p1', title: 'P1', cwd: '', startupCommand: '' },
          ],
        },
      ],
    });
    stateImportConfigMock.mockResolvedValue(1);

    const { container } = render(<ConfigToolbar />);
    openOptionsMenu();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([configJson], 'config.json', {
      type: 'application/json',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(stateImportConfigMock).toHaveBeenCalledWith(configJson);
    });

    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
        'ws-imported',
      );
    });
  });

  it('shows inline error message on export failure', async () => {
    stateExportConfigMock.mockRejectedValue(new Error('export failed'));

    render(<ConfigToolbar />);
    openOptionsMenu();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));
    fireEvent.click(screen.getByRole('button', { name: /^export/i }));

    await waitFor(() => {
      expect(screen.getByText('export failed')).toBeInTheDocument();
    });
  });

  it('shows inline error message on import failure', async () => {
    stateImportConfigMock.mockRejectedValue(new Error('import failed'));

    const { container } = render(<ConfigToolbar />);
    openOptionsMenu();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['{ bad }'], 'config.json', {
      type: 'application/json',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('import failed')).toBeInTheDocument();
    });
  });

  it('saves snapshot on demand', async () => {
    stateSaveSnapshotMock.mockResolvedValue(undefined);

    render(<ConfigToolbar />);
    openOptionsMenu();
    fireEvent.click(screen.getByRole('tab', { name: /config/i }));
    fireEvent.click(screen.getByRole('button', { name: /save snapshot now/i }));

    await waitFor(() => {
      expect(stateSaveSnapshotMock).toHaveBeenCalledTimes(1);
    });
  });
});
