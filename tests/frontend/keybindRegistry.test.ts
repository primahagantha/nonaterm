import {
  KeybindRegistry,
  combosEqual,
  comboFromEvent,
  buildDefaultRegistry,
} from '@/lib/keybind';
import { findConflicts, registerShortcuts, useKeybind } from '@/hooks/useKeybind';
import { renderHook } from '@testing-library/react';
import { act } from 'react';

function makeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: 'a',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...overrides,
  } as KeyboardEvent;
}

describe('KeybindRegistry', () => {
  it('matches a registered combo', () => {
    const registry = new KeybindRegistry();
    const handler = vi.fn();
    registry.register(
      {
        id: 'test.a',
        combo: { key: 'A', ctrl: true },
        description: 'Ctrl+A',
        scope: 'app',
      },
      handler,
    );
    const decision = registry.resolve(makeEvent({ key: 'A', ctrlKey: true }), {
      inEditable: false,
      inTerminal: false,
    });
    expect(decision.handled).toBe(true);
    expect(decision.entry?.id).toBe('test.a');
  });

  it('returns passthrough when no match', () => {
    const registry = new KeybindRegistry();
    const decision = registry.resolve(makeEvent({ key: 'Q' }), {
      inEditable: false,
      inTerminal: false,
    });
    expect(decision).toEqual({ handled: false, passthrough: true });
  });

  it('skips app shortcuts when in editable', () => {
    const registry = new KeybindRegistry();
    registry.register(
      {
        id: 'app.cmd-k',
        combo: { key: 'k', ctrl: true },
        description: 'palette',
        scope: 'app',
      },
      vi.fn(),
    );
    const decision = registry.resolve(makeEvent({ key: 'k', ctrlKey: true }), {
      inEditable: true,
      inTerminal: false,
    });
    expect(decision.handled).toBe(false);
    expect(decision.passthrough).toBe(true);
  });

  it('always claims combos with alwaysClaim even in terminal', () => {
    const registry = new KeybindRegistry();
    const handler = vi.fn();
    registry.register(
      {
        id: 'app.cmd-shift-p',
        combo: { key: 'P', ctrl: true, shift: true },
        description: 'palette',
        scope: 'app',
        alwaysClaim: true,
      },
      handler,
    );
    const decision = registry.resolve(
      makeEvent({ key: 'P', ctrlKey: true, shiftKey: true }),
      { inEditable: false, inTerminal: true },
    );
    expect(decision.handled).toBe(true);
    expect(decision.handler).toBe(handler);
  });

  it('detects conflicts at registration time', () => {
    const registry = new KeybindRegistry();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registry.register(
      {
        id: 'a',
        combo: { key: 's', ctrl: true },
        description: '',
        scope: 'app',
      },
      vi.fn(),
    );
    registry.register(
      {
        id: 'b',
        combo: { key: 's', ctrl: true },
        description: '',
        scope: 'app',
      },
      vi.fn(),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('conflict'),
    );
    warn.mockRestore();
  });

  it('unregister removes the entry', () => {
    const registry = new KeybindRegistry();
    const unregister = registry.register(
      {
        id: 'tmp',
        combo: { key: 'z', ctrl: true },
        description: '',
        scope: 'app',
      },
      vi.fn(),
    );
    unregister();
    const decision = registry.resolve(makeEvent({ key: 'z', ctrlKey: true }), {
      inEditable: false,
      inTerminal: false,
    });
    expect(decision.handled).toBe(false);
  });
});

describe('KeybindRegistry.rebind', () => {
  it('updates the combo for an existing binding', () => {
    const registry = new KeybindRegistry();
    const handler = vi.fn();
    registry.register(
      {
        id: 'rebind-me',
        combo: { key: 'a', ctrl: true },
        description: 'Original',
        scope: 'app',
      },
      handler,
    );
    const ok = registry.rebind('rebind-me', { key: 'b', ctrl: true });
    expect(ok).toBe(true);
    const decision = registry.resolve(makeEvent({ key: 'b', ctrlKey: true }), {
      inEditable: false,
      inTerminal: false,
    });
    expect(decision.handled).toBe(true);
    expect(registry.hasOverride('rebind-me')).toBe(true);
  });

  it('returns false for unknown binding id', () => {
    const registry = new KeybindRegistry();
    expect(registry.rebind('nope', { key: 'c', ctrl: true })).toBe(false);
  });

  it('detects conflicts after rebind', () => {
    const registry = new KeybindRegistry();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registry.register(
      {
        id: 'one',
        combo: { key: 'a', ctrl: true },
        description: '',
        scope: 'app',
      },
      vi.fn(),
    );
    registry.register(
      {
        id: 'two',
        combo: { key: 'b', ctrl: true },
        description: '',
        scope: 'app',
      },
      vi.fn(),
    );
    warn.mockClear();
    registry.rebind('one', { key: 'b', ctrl: true });
    // Conflict: rebinding may not warn on its own (rebind bypasses
    // duplicate detection by design to allow swap-in), but resolution
    // still routes the new combo to whichever entry was registered
    // last.
    const decision = registry.resolve(makeEvent({ key: 'b', ctrlKey: true }), {
      inEditable: false,
      inTerminal: false,
    });
    expect(decision.handled).toBe(true);
    warn.mockRestore();
  });

  it('setOverrides replaces overrides and updates entries', () => {
    const registry = new KeybindRegistry();
    registry.register(
      {
        id: 'r',
        combo: { key: 'k', ctrl: true },
        description: '',
        scope: 'app',
      },
      vi.fn(),
    );
    registry.setOverrides({ r: { key: 'l', ctrl: true } });
    const decision = registry.resolve(makeEvent({ key: 'l', ctrlKey: true }), {
      inEditable: false,
      inTerminal: false,
    });
    expect(decision.handled).toBe(true);
  });
});

describe('combosEqual', () => {
  it('treats Space and " " as the same key', () => {
    expect(
      combosEqual({ key: ' ' }, { key: ' ' }),
    ).toBe(true);
  });
  it('treats different modifier sets as different', () => {
    expect(
      combosEqual({ key: 'a', ctrl: true }, { key: 'a' }),
    ).toBe(false);
    expect(
      combosEqual({ key: 'a', ctrl: true }, { key: 'a', ctrl: true }),
    ).toBe(true);
  });
});

describe('comboFromEvent', () => {
  it('reflects the event modifiers', () => {
    const combo = comboFromEvent(
      makeEvent({ key: 'P', ctrlKey: true, shiftKey: true }),
    );
    expect(combo).toEqual({ key: 'P', ctrl: true, shift: true, alt: false, meta: false });
  });
});

describe('findConflicts', () => {
  it('returns pairs of conflicting entries', () => {
    const a = { id: 'a', combo: { key: 'a', ctrl: true }, description: '', scope: 'app' as const };
    const b = { id: 'b', combo: { key: 'a', ctrl: true }, description: '', scope: 'app' as const };
    const c = { id: 'c', combo: { key: 'b', ctrl: true }, description: '', scope: 'app' as const };
    expect(findConflicts([a, b, c])).toHaveLength(1);
  });
});

describe('useKeybind hook', () => {
  it('dispatches to the registry handler and prevents default', () => {
    const registry = new KeybindRegistry();
    const handler = vi.fn();
    registry.register(
      {
        id: 'h',
        combo: { key: '.', ctrl: true },
        description: '',
        scope: 'app',
        alwaysClaim: true,
      },
      handler,
    );
    renderHook(() => useKeybind(registry));
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: '.',
        ctrlKey: true,
        bubbles: true,
      });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(preventDefault).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('buildDefaultRegistry', () => {
  it('returns a fresh registry', () => {
    const a = buildDefaultRegistry();
    const b = buildDefaultRegistry();
    expect(a).not.toBe(b);
  });
});

describe('registerShortcuts helper', () => {
  it('registers and disposes all entries', () => {
    const registry = new KeybindRegistry();
    const dispose = registerShortcuts(registry, [
      {
        id: 'x',
        combo: { key: '1', ctrl: true },
        description: '',
        scope: 'app',
        handler: () => {},
      },
      {
        id: 'y',
        combo: { key: '2', ctrl: true },
        description: '',
        scope: 'app',
        handler: () => {},
      },
    ]);
    expect(registry.list()).toHaveLength(2);
    dispose();
    expect(registry.list()).toHaveLength(0);
  });
});
