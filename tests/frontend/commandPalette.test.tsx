import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

describe('CommandPalette', () => {
  beforeEach(() => {
    useUiStore.setState({ commandPaletteOpen: false });
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: 'ws-1',
          name: 'Backend',
          accentColor: '#3b82f6',
          layoutPreset: '1',
          panes: [],
        },
        {
          id: 'ws-2',
          name: 'Frontend',
          accentColor: '#22c55e',
          layoutPreset: '1',
          panes: [],
        },
      ],
    });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<CommandPalette />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    expect(screen.getByLabelText('Search commands')).toBeVisible();
  });

  it('lists workspace switch commands', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('Switch to Backend')).toBeVisible();
    expect(screen.getByText('Switch to Frontend')).toBeVisible();
  });

  it('lists app commands', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('Create new workspace')).toBeVisible();
    expect(screen.getByText('Open settings')).toBeVisible();
    expect(screen.getByText('Show keyboard shortcuts')).toBeVisible();
  });

  it('filters commands by search query', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    fireEvent.change(screen.getByLabelText('Search commands'), {
      target: { value: 'settings' },
    });

    expect(screen.getByText('Open settings')).toBeVisible();
    expect(screen.queryByText('Switch to Backend')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('closes on backdrop click', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    fireEvent.click(screen.getByRole('dialog').parentElement!);

    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('shows "No commands match" for unmatched query', () => {
    useUiStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    fireEvent.change(screen.getByLabelText('Search commands'), {
      target: { value: 'xyznonexistent' },
    });

    expect(screen.getByText('No commands match.')).toBeVisible();
  });
});
