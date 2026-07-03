import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, PromptDialog } from '@/components/shell/Dialogs';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Delete?"
        body="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows title + body and triggers onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete workspace?"
        body="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Delete workspace?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('triggers onCancel on Cancel click', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete?"
        body="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('triggers onCancel on Esc', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete?"
        body="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('alertdialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('triggers onCancel on backdrop click', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete?"
        body="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    // Click the backdrop (the outer div with class "modal-backdrop").
    const backdrop = document.querySelector('.modal-backdrop');
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not trigger onCancel when clicking inside the dialog', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete?"
        body="Sure?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText('Sure?'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('PromptDialog', () => {
  it('returns the trimmed value on submit', () => {
    const onConfirm = vi.fn();
    render(
      <PromptDialog
        open
        title="Template name"
        label="Name"
        defaultValue="  my-template  "
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('  my-template  ');

    fireEvent.change(input, { target: { value: '  cleaned  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onConfirm).toHaveBeenCalledWith('cleaned');
  });

  it('disables submit when validator returns error', () => {
    const onConfirm = vi.fn();
    render(
      <PromptDialog
        open
        title="Template name"
        label="Name"
        defaultValue=""
        validate={(value) =>
          value.trim().length > 0 ? null : 'Must not be empty'
        }
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const submit = screen.getByRole('button', { name: 'OK' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Must not be empty');
  });

  it('enables submit when validator passes', () => {
    const onConfirm = vi.fn();
    render(
      <PromptDialog
        open
        title="Template name"
        label="Name"
        defaultValue="hello"
        validate={(value) =>
          value.trim().length > 0 ? null : 'Must not be empty'
        }
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'OK' })).toBeEnabled();
  });

  it('triggers onCancel on Esc', () => {
    const onCancel = vi.fn();
    render(
      <PromptDialog
        open
        title="Name"
        label="Name"
        defaultValue=""
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
