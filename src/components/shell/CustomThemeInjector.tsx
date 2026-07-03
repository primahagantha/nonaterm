import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Injects user-written custom CSS variables into the document.
 * The CSS should contain variable overrides like:
 *   --tw-bg: #0a0a0a;
 *   --tw-accent: #ff6b6b;
 *
 * This component renders nothing visually.
 */
export function CustomThemeInjector() {
  const customThemeCSS = useSettingsStore((s) => s.customThemeCSS);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'nonaterm-custom-theme';
      document.head.appendChild(styleRef.current);
    }

    if (customThemeCSS.trim()) {
      // Wrap in :root selector so users can just write variable declarations
      styleRef.current.textContent = `:root { ${customThemeCSS} }`;
    } else {
      styleRef.current.textContent = '';
    }

    return () => {
      if (styleRef.current) {
        styleRef.current.textContent = '';
      }
    };
  }, [customThemeCSS]);

  return null;
}
