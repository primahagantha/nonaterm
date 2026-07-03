import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal confirmation dialog. Replaces native `window.confirm` which
 * is jarring and not styleable. Supports `Esc` to cancel, `Enter` to
 * confirm, focus trap (initial focus on cancel button for safety),
 * and `aria-modal` + `role="alertdialog"`.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap(dialogRef, open, {
    onClose: onCancel,
    initialFocus: variant === 'danger' ? cancelRef.current : confirmRef.current,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="modal-dialog__title">
          {title}
        </h2>
        <div id="confirm-dialog-body" className="modal-dialog__body">
          {body}
        </div>
        <div className="modal-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn btn--sm ${
              variant === 'danger' ? 'btn--danger' : 'btn--primary'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type PromptDialogProps = {
  open: boolean;
  title: string;
  body?: ReactNode;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Optional synchronous validator. Return a non-empty string to
   * display as an error and disable confirm. Return null/undefined
   * to accept the value.
   */
  validate?: (value: string) => string | null | undefined;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/**
 * Modal prompt dialog. Replaces native `window.prompt`. Supports
 * `Esc` to cancel, `Enter` to submit, focus on the input on open,
 * and a synchronous validator for inline error feedback.
 */
export function PromptDialog({
  open,
  title,
  body,
  label,
  defaultValue = '',
  placeholder,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  validate,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLFormElement | null>(null);

  useFocusTrap(dialogRef, open, { onClose: onCancel });

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  if (!open) {
    return null;
  }

  const error = validate?.(value);
  const canSubmit = value.trim().length > 0 && !error;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSubmit) {
      onConfirm(value.trim());
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
    >
      <form
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="prompt-dialog-title" className="modal-dialog__title">
          {title}
        </h2>
        {body ? <div className="modal-dialog__body">{body}</div> : null}
        <label className="modal-dialog__field">
          <span className="modal-dialog__label">{label}</span>
          <input
            ref={inputRef}
            type="text"
            className={`modal-dialog__input${error ? ' modal-dialog__input--error' : ''}`}
            value={value}
            placeholder={placeholder}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'prompt-dialog-error' : undefined}
          />
          {error ? (
            <span
              id="prompt-dialog-error"
              className="modal-dialog__error"
              role="alert"
            >
              {error}
            </span>
          ) : null}
        </label>
        <div className="modal-dialog__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={!canSubmit}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
