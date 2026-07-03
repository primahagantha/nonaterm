import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalPanePlaceholder } from '@/components/terminal/TerminalPanePlaceholder';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';

function seedStores(passthroughPanes: string[] = []) {
  useWorkspaceStore.setState({
    workspaces: [
      {
        id: 'ws-1',
        name: 'Test WS',
        accentColor: '#3b82f6',
        layoutPreset: '2',
        panes: [
          { id: 'p1', title: 'Agent', cwd: '', startupCommand: '' },
        ],
      },
    ],
    activeWorkspaceId: 'ws-1',
  });
  useTerminalStore.setState({
    sessions: {
      p1: { status: 'running' } as never,
    },
  });
  useSettingsStore.setState({
    passthroughPanes,
  });
}

describe('Passthrough Mode UI Toggle', () => {
  beforeEach(() => {
    useSettingsStore.setState({ passthroughPanes: [], passthroughByDefault: true });
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: undefined });
    useTerminalStore.setState({ sessions: {} });
  });

  it('renders passthrough toggle button in pane header', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle passthrough/i });
    expect(toggleBtn).toBeVisible();
  });

  it('toggle button shows ON state by default (passthroughByDefault=true)', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle passthrough/i });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggle button shows ON state when passthrough is active', () => {
    seedStores(['p1']);
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle passthrough/i });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking toggle button disables passthrough when ON by default', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle passthrough/i });
    fireEvent.click(toggleBtn);

    expect(useSettingsStore.getState().passthroughPanes).not.toContain('p1');
  });

  it('clicking toggle again re-enables passthrough', () => {
    seedStores(['p1']);
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle passthrough/i });
    fireEvent.click(toggleBtn);

    expect(useSettingsStore.getState().passthroughPanes).not.toContain('p1');
  });

  it('pane has passthrough CSS class when active', () => {
    seedStores(['p1']);
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const pane = screen.getByTestId('pane-p1');
    expect(pane).toHaveClass('terminal-pane--passthrough');
  });

  it('pane has data-passthrough attribute', () => {
    seedStores(['p1']);
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    const pane = screen.getByTestId('pane-p1');
    expect(pane).toHaveAttribute('data-passthrough', 'on');
  });

  it('passthrough body indicator shows when active', () => {
    seedStores(['p1']);
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={false}
      />,
    );

    expect(screen.getByText(/Passthrough Mode/)).toBeVisible();
  });
});
