import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceWidget } from '@/components/shell/WorkspaceWidget';

describe('WorkspaceWidget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the notes toggle button', () => {
    render(<WorkspaceWidget workspaceId="ws-1" />);
    expect(screen.getByText('Notes')).toBeVisible();
  });

  it('expands on toggle click showing textarea', () => {
    render(<WorkspaceWidget workspaceId="ws-1" />);

    fireEvent.click(screen.getByText('Notes'));

    expect(screen.getByLabelText('Workspace notes')).toBeVisible();
  });

  it('allows typing notes', () => {
    render(<WorkspaceWidget workspaceId="ws-1" />);

    fireEvent.click(screen.getByText('Notes'));

    const textarea = screen.getByLabelText('Workspace notes');
    fireEvent.change(textarea, { target: { value: 'Test notes' } });

    expect(textarea).toHaveValue('Test notes');
  });

  it('persists notes to localStorage', async () => {
    render(<WorkspaceWidget workspaceId="ws-1" />);

    fireEvent.click(screen.getByText('Notes'));
    fireEvent.change(screen.getByLabelText('Workspace notes'), {
      target: { value: 'Persisted note' },
    });

    // useEffect runs after render — wait a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('nonaterm:widget:ws-1')).toBe('Persisted note');
  });

  it('loads existing notes from localStorage', () => {
    localStorage.setItem('nonaterm:widget:ws-1', 'Existing note');
    render(<WorkspaceWidget workspaceId="ws-1" />);

    fireEvent.click(screen.getByText('Notes'));

    expect(screen.getByLabelText('Workspace notes')).toHaveValue('Existing note');
  });
});
