import { fireEvent, render, screen } from '@testing-library/react';
import { AppShell } from '@/components/shell/AppShell';
import { useUiStore } from '@/stores/uiStore';
import { defaultWorkspaces, useWorkspaceStore } from '@/stores/workspaceStore';

vi.mock('@/hooks/useAppBootstrap', () => ({
  useAppBootstrap: vi.fn(),
}));

vi.mock('@/components/terminal/TerminalGrid', () => ({
  TerminalGrid: () => <section aria-label="Terminal grid">terminal grid mock</section>,
}));

vi.mock('@/components/shell/TerminalLauncher', () => ({
  TerminalLauncher: () => <section aria-label="Terminal launcher">terminal launcher mock</section>,
}));

describe('AppShell QA smoke', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces,
    });
  });

  it('renders active workspace and backend status line', () => {
    useUiStore.getState().setBackendStatus('ready');
    useUiStore.getState().setAppInfo({
      name: 'Nonaterm',
      version: '0.1.0',
      platform: 'windows',
    });
    useUiStore.getState().setDiagnostics({
      appDataDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm',
      logDir: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm\\logs',
      latestLogFile: 'D:\\Users\\prima\\AppData\\Roaming\\Nonaterm\\logs\\Nonaterm.log.2026-06-18',
      recentCrashReports: [],
    });

    render(<AppShell />);

    expect(screen.getByRole('heading', { name: 'Nonaterm Core' })).toBeInTheDocument();
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
    // Diagnostics bar is hidden by default (toggle in Settings > About)
    expect(screen.queryByRole('region', { name: 'Diagnostics summary' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Terminal grid' })).toBeInTheDocument();
  });

  it('shows bootstrap error when backend bootstrap fails', () => {
    useUiStore.getState().setBackendStatus('error', 'backend failed');

    render(<AppShell />);

    expect(screen.getByText('backend failed')).toBeInTheDocument();
  });

  it('switches workspace via Alt+number without intercepting other modifiers', () => {
    render(<AppShell />);

    fireEvent.keyDown(window, { key: '2', altKey: true });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('workspace-playground');

    fireEvent.keyDown(window, { key: '1', ctrlKey: true });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('workspace-playground');
  });

  it('does not intercept Alt+number while typing in an input', () => {
    render(<AppShell />);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: '2', altKey: true });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('workspace-Nonaterm');

    input.remove();
  });
});
