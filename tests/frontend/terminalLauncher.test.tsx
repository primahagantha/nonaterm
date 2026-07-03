import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TerminalLauncher } from '@/components/shell/TerminalLauncher';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const { systemRunPerfProbeMock, systemRunMultiSpawnProbeMock } = vi.hoisted(() => ({
  systemRunPerfProbeMock: vi.fn(),
  systemRunMultiSpawnProbeMock: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  pickFolder: vi.fn(),
  systemRunPerfProbe: systemRunPerfProbeMock,
  systemRunMultiSpawnProbe: systemRunMultiSpawnProbeMock,
}));

describe('TerminalLauncher perf probes', () => {
  beforeEach(() => {
    systemRunPerfProbeMock.mockReset();
    systemRunMultiSpawnProbeMock.mockReset();
    useWorkspaceStore.setState({
      activeWorkspaceId: 'w-perf',
      workspaces: [
        {
          id: 'w-perf',
          name: 'Perf',
          accentColor: '#7c3aed',
          layoutPreset: '1',
          panes: [{ id: 'p1', title: 'P1', cwd: '', startupCommand: '' }],
        },
      ],
    });
  });

  it('runs single perf probe and shows spawn latency', async () => {
    systemRunPerfProbeMock.mockResolvedValue({
      spawnMs: 142,
      shell: 'powershell.exe',
      shellSource: 'env',
      cwd: 'C:\\Users',
      resolverProbeMs: 3,
      totalMs: 145,
      activeSessionsAfter: 1,
    });
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByRole('button', { name: /perf probe/i }));
    await waitFor(() => {
      expect(screen.getByText(/Perf probe: 142 ms via/)).toBeInTheDocument();
    });
  });

  it('runs multi-spawn probe and shows the report', async () => {
    systemRunMultiSpawnProbeMock.mockResolvedValue({
      panes: 9,
      totalSpawnMs: 1100,
      avgSpawnMs: 122,
      p50SpawnMs: 120,
      p95SpawnMs: 180,
      minSpawnMs: 90,
      maxSpawnMs: 200,
      rssBeforeBytes: 80_000_000,
      rssAfterBytes: 90_000_000,
      rssDeltaBytes: 10_000_000,
      targetTotalMs: 1800,
      withinBudget: true,
    });
    render(<TerminalLauncher />);
    fireEvent.click(screen.getByRole('button', { name: /multi probe/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/9 panes in 1100 ms/),
      ).toBeInTheDocument();
    });
  });
});
