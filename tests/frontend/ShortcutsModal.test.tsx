import { render, screen, fireEvent, act } from '@testing-library/react';
import { ShortcutsModal } from '@/components/shell/ShortcutsModal';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

describe('ShortcutsModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({ shortcutsOpen: false });
    useWorkspaceStore.setState({
      activeWorkspaceId: 'w1',
      workspaces: [
        { id: 'w1', name: 'A', accentColor: '#000', layoutPreset: '1', panes: [] },
        { id: 'w2', name: 'B', accentColor: '#000', layoutPreset: '1', panes: [] },
      ],
    });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ShortcutsModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists workspace switch shortcuts for the existing workspaces', () => {
    act(() => {
      useSettingsStore.getState().setShortcutsOpen(true);
    });
    render(<ShortcutsModal />);
    expect(screen.getByText(/workspace #1/i)).toBeInTheDocument();
    expect(screen.getByText(/workspace #2/i)).toBeInTheDocument();
  });

  it('filters via search input', () => {
    act(() => {
      useSettingsStore.getState().setShortcutsOpen(true);
    });
    render(<ShortcutsModal />);
    const input = screen.getByPlaceholderText(/filter shortcuts/i);
    fireEvent.change(input, { target: { value: 'EOF' } });
    expect(screen.getByText(/Send EOF/i)).toBeInTheDocument();
    expect(screen.queryByText(/Send interrupt/i)).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    act(() => {
      useSettingsStore.getState().setShortcutsOpen(true);
    });
    render(<ShortcutsModal />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(useSettingsStore.getState().shortcutsOpen).toBe(false);
  });
});
