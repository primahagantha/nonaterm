import { render, waitFor } from '@testing-library/react';
import { useTerminalStore } from '@/stores/terminalStore';

const invokeFns = vi.hoisted(() => {
  return {
    ptySpawn: vi.fn(),
    ptyClose: vi.fn(),
    ptyWrite: vi.fn(),
    ptyResize: vi.fn(),
    ptyAck: vi.fn(),
    ptyRestart: vi.fn(),
  };
});

const eventRegistry = vi.hoisted(() => {
  const listeners = new Map<string, Array<(event: { payload: unknown }) => void>>();

  return {
    listeners,
    emit(eventName: string, payload: unknown) {
      for (const listener of listeners.get(eventName) ?? []) {
        listener({ payload });
      }
    },
    reset() {
      listeners.clear();
    },
  };
});

const terminalSpies = vi.hoisted(() => {
  return {
    open: vi.fn(),
    loadAddon: vi.fn(),
    write: vi.fn((chunk: string, callback?: () => void) => {
      callback?.();
      return chunk;
    }),
    writeln: vi.fn(),
    dispose: vi.fn(),
  };
});

let onDataHandler: ((data: string) => void) | undefined;

vi.mock('@/lib/tauri', () => ({
  ptySpawn: invokeFns.ptySpawn,
  ptyClose: invokeFns.ptyClose,
  ptyWrite: invokeFns.ptyWrite,
  ptyResize: invokeFns.ptyResize,
  ptyAck: invokeFns.ptyAck,
  ptyRestart: invokeFns.ptyRestart,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (eventName: string, handler: (event: { payload: unknown }) => void) => {
    const listeners = eventRegistry.listeners.get(eventName) ?? [];
    listeners.push(handler);
    eventRegistry.listeners.set(eventName, listeners);

    return () => {
      const currentListeners = eventRegistry.listeners.get(eventName) ?? [];
      eventRegistry.listeners.set(
        eventName,
        currentListeners.filter((registered) => registered !== handler),
      );
    };
  }),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = vi.fn();
  },
}));

vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: class {},
}));

vi.mock('xterm', () => ({
  Terminal: class {
    rows = 24;
    cols = 80;
    open = terminalSpies.open;
    loadAddon = terminalSpies.loadAddon;
    write = terminalSpies.write;
    writeln = terminalSpies.writeln;
    dispose = terminalSpies.dispose;

    onData(callback: (data: string) => void) {
      onDataHandler = callback;
      return { dispose: vi.fn() };
    }
  },
}));

beforeAll(() => {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
});

describe('XtermTerminal QA smoke', () => {
  beforeEach(() => {
    eventRegistry.reset();
    useTerminalStore.setState({ sessions: {} });
    onDataHandler = undefined;
    Object.values(invokeFns).forEach((spy) => spy.mockReset());
    Object.values(terminalSpies).forEach((spy) => spy.mockClear());
    invokeFns.ptySpawn.mockResolvedValue({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      paneId: 'pane-1',
      shell: 'cmd.exe',
      cwd: 'D:\\production\\Nonaterm',
      rows: 24,
      cols: 80,
      processId: 100,
    });
    invokeFns.ptyClose.mockResolvedValue(undefined);
    invokeFns.ptyWrite.mockResolvedValue(undefined);
    invokeFns.ptyResize.mockResolvedValue(undefined);
    invokeFns.ptyAck.mockResolvedValue(undefined);
    invokeFns.ptyRestart.mockResolvedValue(undefined);
  });

  it('spawns a PTY, forwards output to xterm, and ACKs after render', async () => {
    const { XtermTerminal } = await import('@/components/terminal/XtermTerminal');

    render(
      <XtermTerminal
        workspaceId="workspace-1"
        paneId="pane-1"
        cwd="D:\\production\\Nonaterm"
        title="Agent"
        startupCommand=""
        shell="powershell.exe"
      />,
    );

    await waitFor(() => {
      expect(invokeFns.ptySpawn).toHaveBeenCalled();
    });

    eventRegistry.emit('pty:output', {
      workspaceId: 'workspace-1',
      paneId: 'pane-1',
      chunk: 'hello from pty',
    });

    await waitFor(() => {
      expect(terminalSpies.write).toHaveBeenCalledWith('hello from pty', expect.any(Function));
      expect(invokeFns.ptyAck).toHaveBeenCalledWith('pane-1');
    });
  });

  it('writes user input to PTY and marks exit events', async () => {
    const { XtermTerminal } = await import('@/components/terminal/XtermTerminal');

    const { unmount } = render(
      <XtermTerminal
        workspaceId="workspace-1"
        paneId="pane-1"
        cwd="D:\\production\\Nonaterm"
        title="Agent"
        startupCommand=""
        shell="powershell.exe"
      />,
    );

    await waitFor(() => {
      expect(invokeFns.ptySpawn).toHaveBeenCalled();
    });

    onDataHandler?.('dir\r');

    await waitFor(() => {
      expect(invokeFns.ptyWrite).toHaveBeenCalledWith('pane-1', 'dir\r');
    });

    eventRegistry.emit('pty:exit', {
      workspaceId: 'workspace-1',
      paneId: 'pane-1',
      exitCode: 0,
    });

    await waitFor(() => {
      expect(useTerminalStore.getState().sessions['pane-1']?.status).toBe('exited');
    });

    unmount();

    expect(invokeFns.ptyClose).not.toHaveBeenCalled();
  });
});
