import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { defaultWorkspaces, useWorkspaceStore } from '@/stores/workspaceStore';

const { pickFolderMock, workspaceOpenInNewWindowMock, gitDetectRepoMock } =
  vi.hoisted(() => ({
    pickFolderMock: vi.fn(),
    workspaceOpenInNewWindowMock: vi.fn(),
    gitDetectRepoMock: vi.fn(),
  }));

vi.mock('@/lib/tauri', () => ({
  pickFolder: pickFolderMock,
  workspaceOpenInNewWindow: workspaceOpenInNewWindowMock,
  gitDetectRepo: gitDetectRepoMock,
}));

describe('WorkspaceSidebar QA smoke', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeWorkspaceId: defaultWorkspaces[0].id,
      workspaces: defaultWorkspaces,
    });
    pickFolderMock.mockReset();
    workspaceOpenInNewWindowMock.mockReset();
    gitDetectRepoMock.mockReset();
  });

  it('renders all default workspaces and switches active workspace on click', () => {
    const { container } = render(<WorkspaceSidebar />);

    expect(screen.getByRole('navigation', { name: 'Workspaces' })).toBeInTheDocument();
    const selectButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.workspace-list__select'),
    );
    expect(selectButtons.length).toBeGreaterThanOrEqual(2);

    // Click "Playground" via its select button (not the action buttons).
    const playground = selectButtons.find((button) =>
      button.textContent?.toLowerCase().includes('playground'),
    );
    expect(playground).toBeDefined();
    fireEvent.click(playground!);

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('workspace-playground');
  });

  it('shows in-app delete confirmation instead of window.confirm', () => {
    pickFolderMock.mockResolvedValue(null);
    render(<WorkspaceSidebar />);

    const targetId = defaultWorkspaces[0].id;
    fireEvent.click(screen.getByTestId(`delete-workspace-${targetId}`));

    expect(
      screen.getByRole('alertdialog', { name: /Delete workspace\?/i }),
    ).toBeInTheDocument();
  });

  it('cancels delete and keeps workspace when dialog Cancel is clicked', () => {
    pickFolderMock.mockResolvedValue(null);
    render(<WorkspaceSidebar />);

    const initialCount = useWorkspaceStore.getState().workspaces.length;
    fireEvent.click(
      screen.getByTestId(`delete-workspace-${defaultWorkspaces[0].id}`),
    );

    const dialog = screen.getByRole('alertdialog', { name: /Delete workspace\?/i });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(useWorkspaceStore.getState().workspaces.length).toBe(initialCount);
    expect(dialog).not.toBeInTheDocument();
  });

  it('cancels delete on Esc', () => {
    pickFolderMock.mockResolvedValue(null);
    render(<WorkspaceSidebar />);

    const initialCount = useWorkspaceStore.getState().workspaces.length;
    fireEvent.click(
      screen.getByTestId(`delete-workspace-${defaultWorkspaces[0].id}`),
    );

    const dialog = screen.getByRole('alertdialog', { name: /Delete workspace\?/i });
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(useWorkspaceStore.getState().workspaces.length).toBe(initialCount);
    expect(
      screen.queryByRole('alertdialog', { name: /Delete workspace\?/i }),
    ).not.toBeInTheDocument();
  });
});
