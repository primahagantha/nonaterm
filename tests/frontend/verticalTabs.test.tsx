import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VerticalTabs } from '@/components/terminal/VerticalTabs';
import type { Workspace } from '@/types/workspace';

const mockWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Test WS',
  accentColor: '#3b82f6',
  layoutPreset: '2',
  panes: [
    { id: 'p1', title: 'Agent', cwd: '', startupCommand: '' },
    { id: 'p2', title: 'Dev UI', cwd: '', startupCommand: '' },
  ],
};

describe('VerticalTabs', () => {
  it('renders tab buttons for each pane', () => {
    render(<VerticalTabs workspace={mockWorkspace} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Agent');
    expect(tabs[1]).toHaveTextContent('Dev UI');
  });

  it('first tab is active by default', () => {
    render(<VerticalTabs workspace={mockWorkspace} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab switches active pane', () => {
    render(<VerticalTabs workspace={mockWorkspace} />);

    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);

    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('returns null for empty panes', () => {
    const { container } = render(
      <VerticalTabs workspace={{ ...mockWorkspace, panes: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
