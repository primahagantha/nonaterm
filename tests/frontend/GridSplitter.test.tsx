import { fireEvent, render, screen } from '@testing-library/react';
import { TerminalGrid } from '@/components/terminal/TerminalGrid';
import { useUiStore } from '@/stores/uiStore';
import type { Workspace } from '@/types/workspace';

vi.mock('@/components/terminal/TerminalPanePlaceholder', () => ({
  TerminalPanePlaceholder: ({
    paneId,
    title,
  }: {
    paneId: string;
    title: string;
  }) => (
    <div>
      <span>{title} terminal mock</span>
      <code>{paneId}</code>
    </div>
  ),
}));

const twoPaneWorkspace: Workspace = {
  id: 'ws-split',
  name: 'Split Test',
  accentColor: '#7c3aed',
  layoutPreset: '2',
  panes: [
    { id: 'pane-l', title: 'Left', cwd: '', startupCommand: '' },
    { id: 'pane-r', title: 'Right', cwd: '', startupCommand: '' },
  ],
};

const singlePaneWorkspace: Workspace = {
  id: 'ws-single',
  name: 'Single',
  accentColor: '#0ea5e9',
  layoutPreset: '1',
  panes: [
    { id: 'pane-only', title: 'Solo', cwd: '', startupCommand: '' },
  ],
};

describe('GridSplitter', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('renders a splitter for 2-pane layout', () => {
    render(<TerminalGrid workspace={twoPaneWorkspace} />);

    const splitter = screen.getByRole('separator');
    expect(splitter).toBeInTheDocument();
    expect(splitter).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('updates paneSizes in store on drag', () => {
    render(<TerminalGrid workspace={twoPaneWorkspace} />);

    const gridSection = screen.getByRole('region', { name: 'Terminal grid' });
    gridSection.getBoundingClientRect = () => ({
      width: 1000,
      height: 500,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const splitter = screen.getByRole('separator');
    fireEvent.mouseDown(splitter, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 700 });
    fireEvent.mouseUp(document);

    const sizes = useUiStore.getState().paneSizes['ws-split'];
    expect(sizes).toBeDefined();
    expect(sizes.columns[0]).toBeCloseTo(0.7, 2);
  });

  it('does not render a splitter for 1-pane layout', () => {
    render(<TerminalGrid workspace={singlePaneWorkspace} />);

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
