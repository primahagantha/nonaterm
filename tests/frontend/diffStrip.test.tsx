import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DiffStrip } from '@/components/shell/DiffStrip';

describe('DiffStrip', () => {
  it('renders nothing when no changes', () => {
    const { container } = render(<DiffStrip workspaceId="ws-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows count when file change events arrive', () => {
    render(<DiffStrip workspaceId="ws-1" />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('Nonaterm:file-changed', {
          detail: { workspaceId: 'ws-1', path: 'src/main.ts' },
        }),
      );
    });

    expect(screen.getByText('1 changed')).toBeVisible();
  });

  it('shows multiple changes', () => {
    render(<DiffStrip workspaceId="ws-1" />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('Nonaterm:file-changed', {
          detail: { workspaceId: 'ws-1', path: 'src/main.ts' },
        }),
      );
      window.dispatchEvent(
        new CustomEvent('Nonaterm:file-changed', {
          detail: { workspaceId: 'ws-1', path: 'src/utils.ts' },
        }),
      );
    });

    expect(screen.getByText('2 changed')).toBeVisible();
  });

  it('expands list on click showing changed files', () => {
    render(<DiffStrip workspaceId="ws-1" />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('Nonaterm:file-changed', {
          detail: { workspaceId: 'ws-1', path: 'src/components/App.tsx' },
        }),
      );
    });

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('App.tsx')).toBeVisible();
  });

  it('ignores events for other workspaces', () => {
    const { container } = render(<DiffStrip workspaceId="ws-1" />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('Nonaterm:file-changed', {
          detail: { workspaceId: 'ws-2', path: 'src/other.ts' },
        }),
      );
    });

    expect(container.firstChild).toBeNull();
  });
});
