import { render, screen } from '@testing-library/react';
import { TerminalGrid } from '@/components/terminal/TerminalGrid';
import { defaultWorkspaces } from '@/stores/workspaceStore';

vi.mock('@/components/terminal/TerminalPanePlaceholder', () => ({
  TerminalPanePlaceholder: ({ paneId, title }: { paneId: string; title: string }) => (
    <div>
      <span>{title} terminal mock</span>
      <code>{paneId}</code>
    </div>
  ),
}));

describe('TerminalGrid QA smoke', () => {
  it('renders pane placeholders for workspace panes', () => {
    render(<TerminalGrid workspace={defaultWorkspaces[0]} />);

    expect(screen.getByText('PowerShell terminal mock')).toBeInTheDocument();
    expect(screen.getByText('pane-main')).toBeInTheDocument();
  });

  it('renders an empty grid safely when workspace is missing', () => {
    render(<TerminalGrid />);

    expect(screen.getByRole('region', { name: 'Terminal grid' })).toBeInTheDocument();
    expect(screen.queryByText(/terminal mock/i)).not.toBeInTheDocument();
  });
});
