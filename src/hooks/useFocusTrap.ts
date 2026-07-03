import { useEffect, useRef, type RefObject } from 'react';

/**
 * Hook to trap focus within a container element when a modal is open.
 * Handles Tab, Shift+Tab, Escape key, and auto-focuses first focusable element.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  options?: {
    onClose?: () => void;
    initialFocus?: 'first' | 'last' | HTMLElement | null;
  },
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !containerRef.current) {
      return;
    }

    // Store the previously focused element to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');
      return Array.from(container.querySelectorAll(selectors)) as HTMLElement[];
    };

    // Focus the initial element
    const focusInitial = () => {
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      if (options?.initialFocus instanceof HTMLElement) {
        options.initialFocus.focus();
      } else if (options?.initialFocus === 'last') {
        focusable[focusable.length - 1]?.focus();
      } else {
        // Default: focus first focusable element
        focusable[0]?.focus();
      }
    };

    // Handle Tab key for focus trapping
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        options?.onClose?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if at first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if at last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus initial element on mount
    focusInitial();

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      previousFocusRef.current?.focus();
    };
  }, [open, containerRef, options]);
}

/**
 * Hook to manage focus restoration when a modal closes.
 */
export function useFocusRestore() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    previousFocusRef.current?.focus();
  };

  return { saveFocus, restoreFocus };
}
