import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalPanePlaceholder } from '@/components/terminal/TerminalPanePlaceholder';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';

function seedStores() {
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
  useSettingsStore.setState({ passthroughPanes: [] });
}

describe('Search Scrollback', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: undefined });
    useTerminalStore.setState({ sessions: {} });
    useSettingsStore.setState({ passthroughPanes: [] });
  });

  it('search bar is hidden by default', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={true}
      />,
    );

    expect(screen.queryByLabelText('Search terminal')).not.toBeInTheDocument();
  });

  it('search bar has close button', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={true}
      />,
    );

    // Simulate Ctrl+F
    fireEvent.keyDown(window, { ctrlKey: true, key: 'f' });

    const closeBtn = screen.getByRole('button', { name: /close search/i });
    expect(closeBtn).toBeVisible();
  });

  it('clicking close button hides search bar', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={true}
      />,
    );

    // Open search
    fireEvent.keyDown(window, { ctrlKey: true, key: 'f' });
    expect(screen.getByLabelText('Search terminal')).toBeVisible();

    // Close search
    const closeBtn = screen.getByRole('button', { name: /close search/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByLabelText('Search terminal')).not.toBeInTheDocument();
  });

  it('Escape key closes search bar', () => {
    seedStores();
    render(
      <TerminalPanePlaceholder
        workspaceId="ws-1"
        paneId="p1"
        title="Agent"
        cwd=""
        startupCommand=""
        defaultOpen={true}
      />,
    );

    // Open search
    fireEvent.keyDown(window, { ctrlKey: true, key: 'f' });
    const input = screen.getByLabelText('Search terminal');

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByLabelText('Search terminal')).not.toBeInTheDocument();
  });
});
