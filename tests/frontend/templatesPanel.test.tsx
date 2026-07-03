import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { OptionsMenu } from '@/components/shell/OptionsMenu';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const { templatesListMock, templatesMaterializeMock } = vi.hoisted(() => ({
  templatesListMock: vi.fn(),
  templatesMaterializeMock: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  stateExportConfig: vi.fn(),
  stateImportConfig: vi.fn(),
  stateSaveSnapshot: vi.fn(),
  templatesList: templatesListMock,
  templatesMaterialize: templatesMaterializeMock,
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: { appInfo: null; diagnostics: null; backendStatus: string }) => unknown) =>
    selector({ appInfo: null, diagnostics: null, backendStatus: 'ready' }),
}));

describe('TemplatesPanel', () => {
  beforeEach(() => {
    templatesListMock.mockReset();
    templatesMaterializeMock.mockReset();
    useSettingsStore.setState({ optionsOpen: false });
    useWorkspaceStore.setState({
      activeWorkspaceId: '',
      workspaces: [],
    });
  });

  it('lists templates and creates a workspace on click', async () => {
    templatesListMock.mockResolvedValue([
      {
        id: 'frontend-dev',
        label: 'Frontend dev',
        description: 'Dev server + tests',
        accentColor: '#0ea5e9',
        layoutPreset: '2',
        panes: [
          { title: 'Vite', cwd: '', shell: null, startupCommand: 'npm run dev' },
          { title: 'Tests', cwd: '', shell: null, startupCommand: '' },
        ],
      },
    ]);
    templatesMaterializeMock.mockResolvedValue({
      id: 'workspace-template-1',
      name: 'Frontend dev',
      accentColor: '#0ea5e9',
      layoutPreset: '2',
      paneCount: 2,
    });

    render(<OptionsMenu />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    fireEvent.click(screen.getByRole('tab', { name: /templates/i }));

    await waitFor(() => {
      expect(screen.getByText(/Frontend dev/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('template-use-frontend-dev'));

    await waitFor(() => {
      expect(templatesMaterializeMock).toHaveBeenCalledWith(
        'frontend-dev',
        'Frontend dev',
      );
      expect(useWorkspaceStore.getState().workspaces.length).toBeGreaterThan(0);
    });
  });
});
