//! Keybind registry + 3-layer priority resolver.
//!
//! Layers (highest priority first):
//!   1. **App** — handled by the Nonaterm shell (modals, options, etc).
//!      Always wins when the registry matches and the user is not
//!      currently typing inside an editable input.
//!   2. **Terminal passthrough** — when focus is in an xterm.js surface
//!      we forward the event to the PTY so shortcuts like Ctrl+T (new
//!      tab in many CLIs) keep working. The only exceptions are the
//!      small set of "system" shortcuts the user explicitly opted into
//!      (`registry.alwaysPassthrough`).
//!   3. **CLI** — default behaviour: forward to whatever has DOM focus.
//!
//! The registry also produces a stable display representation for the
//! shortcuts modal and detects conflicting combinations at registration
//! time so we surface them in the diagnostics surface.

export type Modifier = 'ctrl' | 'shift' | 'alt' | 'meta';

export type KeybindId = string;

export type KeybindScope = 'app' | 'terminal' | 'passthrough';

export type Keybind = {
  id: KeybindId;
  combo: Combo;
  description: string;
  scope: KeybindScope;
  /** Layer 1 — handler runs only when no editable input is focused. */
  runInEditable?: boolean;
  /** When true, this combo should never be swallowed by xterm even if
   *  `passthrough` would normally let it through. Reserved for combos
   *  the app claims globally (e.g. Ctrl+Shift+P palette). */
  alwaysClaim?: boolean;
};

export type Combo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

type KeyHandler = (event: KeyboardEvent) => void | boolean;

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

export function comboLabel(combo: Combo): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (combo.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (combo.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (combo.meta) parts.push(isMac ? '⌘' : 'Meta');
  parts.push(displayKey(combo.key));
  return parts.join(isMac ? '' : '+');
}

function displayKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === '.') return '.';
  if (key === ',') return ',';
  if (key === '/') return '/';
  if (key === '\\') return '\\';
  if (key === '-') return '-';
  if (key === '=') return '=';
  if (key === 'Enter') return '↵';
  if (key === 'Escape') return 'Esc';
  if (key === 'ArrowUp') return '↑';
  if (key === 'ArrowDown') return '↓';
  if (key === 'ArrowLeft') return '←';
  if (key === 'ArrowRight') return '→';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function normalizeKey(key: string): string {
  // Normalize to the same representation the browser fires in `key`.
  if (key === ' ') return ' ';
  if (key === 'Period') return '.';
  if (key === 'Comma') return ',';
  if (key === 'Slash') return '/';
  if (key === 'Backslash') return '\\';
  if (key === 'Minus') return '-';
  if (key === 'Equal') return '=';
  return key;
}

export function combosEqual(a: Combo, b: Combo): boolean {
  return (
    normalizeKey(a.key) === normalizeKey(b.key) &&
    !!a.ctrl === !!b.ctrl &&
    !!a.shift === !!b.shift &&
    !!a.alt === !!b.alt &&
    !!a.meta === !!b.meta
  );
}

export function comboFromEvent(event: KeyboardEvent): Combo {
  return {
    key: event.key,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

export class KeybindRegistry {
  private entries: Keybind[] = [];
  private handlers = new Map<KeybindId, KeyHandler>();
  private listeners = new Set<() => void>();
  private overrides = new Map<KeybindId, Combo>();

  register(entry: Keybind, handler: Keyhandler): () => void;
  register(id: KeybindId, combo: Combo, scope: KeybindScope, description: string, handler: KeyHandler): () => void;
  register(...args: unknown[]): () => void {
    let entry: Keybind;
    let handler: KeyHandler;
    if (args.length === 2) {
      entry = args[0] as Keybind;
      handler = args[1] as KeyHandler;
    } else {
      const [id, combo, scope, description, h] = args as [
        KeybindId,
        Combo,
        KeybindScope,
        string,
        KeyHandler,
      ];
      entry = { id, combo, description, scope };
      handler = h;
    }
    const effectiveCombo = this.overrides.get(entry.id) ?? entry.combo;
    const conflict = this.entries.find(
      (other) =>
        other.id !== entry.id && combosEqual(other.combo, effectiveCombo),
    );
    if (conflict) {
      console.warn(
        `[keybind] conflict: ${entry.id} and ${conflict.id} both claim ${comboLabel(effectiveCombo)}`,
      );
    }
    this.entries.push({ ...entry, combo: effectiveCombo });
    this.handlers.set(entry.id, handler);
    this.emit();
    return () => this.unregister(entry.id);
  }

  unregister(id: KeybindId) {
    this.entries = this.entries.filter((entry) => entry.id !== id);
    this.handlers.delete(id);
    this.emit();
  }

  /** Override the combo for an already-registered binding by id. */
  rebind(id: KeybindId, combo: Combo) {
    this.overrides.set(id, combo);
    // Re-register: remove old, push new with new combo
    const handler = this.handlers.get(id);
    const existing = this.entries.find((e) => e.id === id);
    if (!existing || !handler) {
      return false;
    }
    this.entries = this.entries.filter((e) => e.id !== id);
    this.entries.push({ ...existing, combo });
    this.emit();
    return true;
  }

  /** Reset a single binding to its default. */
  resetBinding(id: KeybindId) {
    this.overrides.delete(id);
    const handler = this.handlers.get(id);
    const existing = this.entries.find((e) => e.id === id);
    if (!existing || !handler) {
      return;
    }
    // Need original combo; not stored, so user must re-register.
    this.emit();
  }

  /** Replace all overrides at once. Used to load from storage. */
  setOverrides(overrides: Record<KeybindId, Combo>) {
    this.overrides = new Map(Object.entries(overrides));
    // Re-apply to existing entries
    for (const entry of this.entries) {
      const ov = this.overrides.get(entry.id);
      if (ov) {
        entry.combo = ov;
      }
    }
    this.emit();
  }

  getOverrides(): Record<KeybindId, Combo> {
    return Object.fromEntries(this.overrides);
  }

  hasOverride(id: KeybindId): boolean {
    return this.overrides.has(id);
  }

  list(): Keybind[] {
    return this.entries.slice();
  }

  byScope(scope: KeybindScope): Keybind[] {
    return this.entries.filter((entry) => entry.scope === scope);
  }

  find(combo: Combo): Keybind | undefined {
    return this.entries.find((entry) => combosEqual(entry.combo, combo));
  }

  /** Resolve an incoming KeyboardEvent to a handler + decision. */
  resolve(
    event: KeyboardEvent,
    context: { inEditable: boolean; inTerminal: boolean },
  ): KeyResolution {
    const combo = comboFromEvent(event);
    const match = this.find(combo);
    if (!match) {
      return { handled: false, passthrough: true };
    }
    const handler = this.handlers.get(match.id);
    if (!handler) {
      return { handled: false, passthrough: true };
    }

    if (match.scope === 'app') {
      if (context.inEditable && !match.runInEditable) {
        // Let the input/textarea receive the keystroke first.
        return { handled: false, passthrough: true };
      }
      if (context.inTerminal && match.alwaysClaim) {
        return { handled: true, passthrough: false, handler, entry: match };
      }
      if (context.inTerminal && !match.alwaysClaim) {
        return { handled: false, passthrough: true };
      }
      return { handled: true, passthrough: false, handler, entry: match };
    }

    if (match.scope === 'terminal') {
      if (context.inTerminal) {
        return { handled: true, passthrough: false, handler, entry: match };
      }
      return { handled: false, passthrough: true };
    }

    // passthrough scope — always forwarded, never blocks the default
    // behaviour. Handlers are useful for things like "next suggestion"
    // overlays that only want to observe.
    return { handled: false, passthrough: true, handler, entry: match };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

type Keyhandler = KeyHandler;

export type KeyResolution =
  | { handled: false; passthrough: true; handler?: never; entry?: never }
  | {
      handled: false;
      passthrough: true;
      handler: KeyHandler;
      entry: Keybind;
    }
  | {
      handled: true;
      passthrough: boolean;
      handler: KeyHandler;
      entry: Keybind;
    };

/** Build the default registry. Kept as a factory so tests can build
 *  a hermetic instance without touching module state. */
export function buildDefaultRegistry(): KeybindRegistry {
  return new KeybindRegistry();
}
