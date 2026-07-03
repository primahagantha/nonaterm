import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalLauncher } from '@/components/shell/TerminalLauncher';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const { systemRunPerfProbeMock, systemRunMultiSpawnProbeMock } = vi.hoisted(
  () => ({
    systemRunPerfProbeMock: vi.fn(),
    systemRunMultiSpawnProbeMock: vi.fn(),
  }),
);

vi.mock('@/lib/tauri', () => ({
  systemRunPerfProbe: systemRunPerfProbeMock,
  systemRunMultiSpawnProbe: systemRunMultiSpawnProbeMock,
}));

describe('TerminalLauncher', () => {
  beforeEach(() => {
    systemRunPerfProbeMock.mockReset();
    systemRunMultiSpawnProbeMock.mockReset();
    useUiStore.setState({
      terminalConfigModalOpen: false,
      fastLaunchModalOpen: false,
    });
  });

  it('opens terminal config modal when Add Pane is clicked', () => {
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByTestId('launcher-add-pane'));
    expect(useUiStore.getState().terminalConfigModalOpen).toBe(true);
  });

  it('opens fast launch modal when More is clicked', () => {
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByText(/More…/));
    expect(useUiStore.getState().fastLaunchModalOpen).toBe(true);
  });

  it('renders quick-launch buttons for OpenCode, Claude, Codex', () => {
    render(<TerminalLauncher />);
    expect(screen.getByText(/OpenCode/)).toBeDefined();
    expect(screen.getByText(/Claude Code/)).toBeDefined();
    expect(screen.getByText(/Codex/)).toBeDefined();
  });

  it('quick-launch button creates workspace on click', () => {
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByText(/OpenCode/));
    const { workspaces, activeWorkspaceId } = useWorkspaceStore.getState();
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    expect(ws).toBeDefined();
    expect(ws!.name).toBe('OpenCode');
  });

  it('runs perf probe when clicked', async () => {
    systemRunPerfProbeMock.mockResolvedValue({
      spawnMs: 100,
      shell: 'powershell.exe',
      shellSource: 'config',
    });
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByTestId('launcher-perf-probe'));
    await screen.findByText(/Perf probe: 100 ms/);
    expect(systemRunPerfProbeMock).toHaveBeenCalled();
  });

  it('runs multi-spawn probe when clicked', async () => {
    systemRunMultiSpawnProbeMock.mockResolvedValue({
      panes: 9,
      totalSpawnMs: 900,
      avgSpawnMs: 100,
      p95SpawnMs: 150,
      rssDeltaBytes: 1024 * 1024,
      withinBudget: true,
    });
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByTestId('launcher-multi-probe'));
    await screen.findByText(/9 panes in 900 ms/);
    expect(systemRunMultiSpawnProbeMock).toHaveBeenCalled();
  });
});
