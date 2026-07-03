import { useEffect, useRef } from 'react';
import {
  combosEqual,
  comboFromEvent,
  type Combo,
  type Keybind,
  type KeybindRegistry,
  type KeybindScope,
} from '@/lib/keybind';
import { useSettingsStore } from '@/stores/settingsStore';

export type UseKeybindOptions = {
  /** When the user is editing text inside a contentEditable or
   *  input/textarea, the registry's app-layer shortcuts won't fire. */
  isEditable?: (target: EventTarget | null) => boolean;
  /** When the focus is inside an xterm.js surface. */
  isTerminal?: (target: EventTarget | null) => boolean;
  /** Pane ids that are currently in passthrough mode — for those,
   *  the keydown listener will not call preventDefault so the PTY
   *  receives the keystroke. If omitted, we auto-subscribe to the
   *  global settings store and read `passthroughPanes`. */
  passthroughPanes?: (paneId: string) => boolean;
};

const defaultIsEditable = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  return target.isContentEditable;
};

const defaultIsTerminal = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.closest('.xterm-surface, .xterm') !== null;
};

const defaultIsPassthrough = (paneId: string): boolean => {
  // Default: defer to the global settings store so opt-in works
  // without each caller wiring its own selector.
  return useSettingsStore.getState().passthroughPanes.includes(paneId);
};

/** Bind a KeybindRegistry to the document. Returns the listener so the
 *  caller can dispose on unmount. */
export function useKeybind(
  registry: KeybindRegistry,
  options: UseKeybindOptions = {},
) {
  // The default passthrough callback reads from the global settings
  // store on every call, so updates are picked up without explicit
  // subscription here.
  const optsRef = useRef({
    isEditable: options.isEditable ?? defaultIsEditable,
    isTerminal: options.isTerminal ?? defaultIsTerminal,
    passthroughPanes:
      options.passthroughPanes ?? defaultIsPassthrough,
  });

  useEffect(() => {
    optsRef.current = {
      isEditable: options.isEditable ?? defaultIsEditable,
      isTerminal: options.isTerminal ?? defaultIsTerminal,
      passthroughPanes:
        options.passthroughPanes ?? defaultIsPassthrough,
    };
  }, [
    options.isEditable,
    options.isTerminal,
    options.passthroughPanes,
  ]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const inEditable = optsRef.current.isEditable(event.target);
      const inTerminal = optsRef.current.isTerminal(event.target);
      // Always read the live passthrough list from the store so
      // toggling Passthrough Mode takes effect immediately without
      // waiting for a re-render to update the ref.
      const passthroughList = useSettingsStore.getState().passthroughPanes;
      const isPassthrough = (paneId: string) =>
        passthroughList.includes(paneId);
      const passthroughPanes = optsRef.current.passthroughPanes ?? isPassthrough;
      const targetEl = event.target as HTMLElement | null;

      const inPassthrough = (() => {
        if (!inTerminal || !targetEl) {
          return false;
        }
        const term = targetEl.closest('[data-pane-id]');
        if (!term) {
          return false;
        }
        const paneId = term.getAttribute('data-pane-id');
        return paneId ? passthroughPanes(paneId) : false;
      })();

      const decision = registry.resolve(event, { inEditable, inTerminal });
      if (inPassthrough && !decision.entry?.alwaysClaim) {
        return; // forward to PTY
      }
      if (!decision.handled) {
        if (decision.passthrough) {
          return; // let the event continue
        }
        return;
      }
      // Always preventDefault for handled shortcuts to avoid double-fire.
      event.preventDefault();
      event.stopPropagation();
      const result = decision.handler?.(event);
      if (result === false) {
        // Handler can opt back into default by returning false. The
        // browser will still see `preventDefault` already called,
        // so this is mostly a hook for tests.
        return;
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [registry]);
}

/** Build a `Combo` from a native KeyboardEvent. */
export function comboFromReact(event: KeyboardEvent): Combo {
  return comboFromEvent(event);
}

/** Helper to register a batch of shortcuts in one call. */
export function registerShortcuts(
  registry: KeybindRegistry,
  entries: Array<{
    id: string;
    combo: Combo;
    description: string;
    scope: KeybindScope;
    runInEditable?: boolean;
    alwaysClaim?: boolean;
    handler: (event: KeyboardEvent) => void;
  }>,
) {
  const unsubs: Array<() => void> = [];
  for (const entry of entries) {
    const keybind: Keybind = {
      id: entry.id,
      combo: entry.combo,
      description: entry.description,
      scope: entry.scope,
      runInEditable: entry.runInEditable,
      alwaysClaim: entry.alwaysClaim,
    };
    unsubs.push(registry.register(keybind, entry.handler));
  }
  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}

/** Detect conflicts in a list of entries. Returns the conflicting pairs. */
export function findConflicts(entries: Keybind[]): Array<[Keybind, Keybind]> {
  const conflicts: Array<[Keybind, Keybind]> = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (combosEqual(entries[i].combo, entries[j].combo)) {
        conflicts.push([entries[i], entries[j]]);
      }
    }
  }
  return conflicts;
}
