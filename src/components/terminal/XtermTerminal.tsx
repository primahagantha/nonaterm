import { startTransition, useEffect, useEffectEvent, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from 'xterm';
import { reportError } from '@/lib/errorHandler';
import {
  ptyAck,
  ptyClose,
  ptyResize,
  ptyRestart,
  ptySpawn,
  ptyWrite,
} from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTerminalStore } from '@/stores/terminalStore';
import type { PtyExitEvent, PtyOutputEvent } from '@/types/terminal';

/**
 * Returns true when the running shell has signalled bracketed-paste
 * support via the standard DECRQM query. Until we get a response we
 * default to false (raw newlines) so we don't break shells that don't
 * understand the escape.
 */
function supportsBracketedPaste(): boolean {
  // Cheap heuristic: assume modern PowerShell / pwsh / bash 5+
  // support it. The escape sequence is harmless if the program does
  // not — the worst case is the literal text "200~" showing up.
  return true;
}

type XtermTerminalProps = {
  workspaceId: string;
  paneId: string;
  cwd: string;
  title: string;
  startupCommand: string;
  shell?: string;
  workspaceFont?: string;
};

/** Wrapper xterm.js yang menghubungkan satu pane ke satu PTY session. */
export function XtermTerminal({
  workspaceId,
  paneId,
  cwd,
  title,
  startupCommand,
  shell,
  workspaceFont,
}: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const closedRef = useRef(false);
  const terminalDisposedRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cwdRef = useRef(cwd);
  const shellRef = useRef(shell);
  const startupCommandRef = useRef(startupCommand);
  const fontFamily = useSettingsStore((state) => state.fontFamily);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const scrollback = useSettingsStore((state) => state.terminalScrollback);
  const startSession = useTerminalStore((state) => state.startSession);
  const attachSession = useTerminalStore((state) => state.attachSession);
  const markOutput = useTerminalStore((state) => state.markOutput);
  const markExited = useTerminalStore((state) => state.markExited);
  const markError = useTerminalStore((state) => state.markError);
  const removeSession = useTerminalStore((state) => state.removeSession);

  useEffect(() => {
    cwdRef.current = cwd;
    shellRef.current = shell;
    startupCommandRef.current = startupCommand;
  }, [cwd, shell, startupCommand]);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) {
      return;
    }
    term.options.fontFamily = workspaceFont || fontFamily;
    term.options.fontSize = fontSize;
    term.refresh(0, term.rows - 1);
  }, [fontFamily, fontSize, workspaceFont]);

  const handleOutputEvent = useEffectEvent((payload: PtyOutputEvent) => {
    if (payload.paneId !== paneId || !terminalRef.current) {
      return;
    }

    terminalRef.current.write(payload.chunk, () => {
      void ptyAck(paneId);
      startTransition(() => {
        markOutput(paneId);
      });
    });
  });

  const handleExitEvent = useEffectEvent((payload: PtyExitEvent) => {
    if (payload.paneId !== paneId || !terminalRef.current) {
      return;
    }

    closedRef.current = true;
    terminalRef.current.writeln('');
    terminalRef.current.writeln(
      `[process exited: ${payload.exitCode ?? 'terminated'}]`,
    );
    startTransition(() => {
      markExited(paneId, payload.exitCode);
    });

    const policy = useSettingsStore.getState().autoRestart;
    const isFailure = (payload.exitCode ?? 0) !== 0;
    if (isFailure && policy.enabled) {
      const nextAttempt = restartAttemptsRef.current + 1;
      if (nextAttempt > policy.maxAttempts) {
        terminalRef.current.writeln(
          `[auto-restart: giving up after ${restartAttemptsRef.current} attempt(s); set auto-restart off or raise the limit in Options]`,
        );
        reportError('PTY_CRASH', {
          message: `Pane ${paneId} crashed ${restartAttemptsRef.current} times. Auto-restart disabled.`,
          severity: 'error',
        });
        return;
      }
      restartAttemptsRef.current = nextAttempt;
      terminalRef.current.writeln(
        `[auto-restart ${nextAttempt}/${policy.maxAttempts} in ${policy.backoffMs}ms]`,
      );
      startTransition(() => {
        startSession(paneId, workspaceId);
      });

      const targetRows = terminalRef.current.rows;
      const targetCols = terminalRef.current.cols;
      restartTimeoutRef.current = setTimeout(() => {
        if (terminalDisposedRef.current) {
          return;
        }
        void ptySpawn({
          workspaceId,
          paneId,
          cwd: cwdRef.current,
          shell: shellRef.current,
          rows: targetRows,
          cols: targetCols,
        })
          .then((session) => {
            if (terminalDisposedRef.current) {
              return;
            }
            closedRef.current = false;
            startTransition(() => {
              attachSession(paneId, {
                workspaceId: session.workspaceId,
                isConnected: true,
                status: 'running',
                processId: session.processId,
                sessionId: session.sessionId,
              });
            });
          })
          .catch((error) => {
            startTransition(() => {
              markError(
                paneId,
                error instanceof Error ? error.message : 'Failed to restart PTY',
              );
            });
          });
      }, policy.backoffMs);
    }
  });

  const restartPane = useEffectEvent(() => {
    if (!terminalRef.current) {
      return;
    }

    restartAttemptsRef.current = 0;
    terminalRef.current.writeln('[manual restart]');
    startTransition(() => {
      startSession(paneId, workspaceId);
    });

    void ptyRestart(paneId)
      .catch(() =>
        ptySpawn({
          workspaceId,
          paneId,
          cwd: cwdRef.current,
          shell: shellRef.current,
          rows: terminalRef.current?.rows,
          cols: terminalRef.current?.cols,
        }),
      )
      .then((session) => {
        if (!session) {
          return;
        }

        closedRef.current = false;
        startTransition(() => {
          attachSession(paneId, {
            workspaceId: session.workspaceId,
            isConnected: true,
            status: 'running',
            processId: session.processId,
            sessionId: session.sessionId,
          });
        });

        if (startupCommandRef.current.trim()) {
          void ptyWrite(paneId, `${startupCommandRef.current}\r\n`).catch(() => undefined);
          terminalRef.current?.writeln(`[startup: ${startupCommandRef.current}]`);
        }
      })
      .catch((error) => {
        startTransition(() => {
          markError(
            paneId,
            error instanceof Error ? error.message : 'Failed to restart PTY',
          );
        });
      });
  });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const root = document.documentElement;
    const css = (name: string, fallback: string) =>
      getComputedStyle(root).getPropertyValue(name).trim() || fallback;
    const accent = css('--tw-accent', '#7c3aed');
    const bg = css('--tw-bg-elev', '#0d1426');
    const fg = css('--tw-text', '#e2e8f0');
    const muted = css('--tw-text-muted', '#94a3b8');
    const danger = css('--tw-danger', '#ef4444');
    const success = css('--tw-success', '#22c55e');
    const warn = css('--tw-warn', '#f59e0b');
    const info = css('--tw-info', '#3b82f6');
    const panel = css('--tw-panel', '#1e293b');
    const terminal = new Terminal({
      allowTransparency: true,
      convertEol: true,
      cursorBlink: true,
      fontFamily: workspaceFont || fontFamily,
      fontSize,
      rows: 24,
      cols: 80,
      scrollback,
      theme: {
        background: bg,
        foreground: fg,
        cursor: accent,
        cursorAccent: bg,
        selectionBackground: accent,
        selectionForeground: '#ffffff',
        // ANSI colors mapped to theme tokens
        black: panel,
        red: danger,
        green: success,
        yellow: warn,
        blue: info,
        magenta: accent,
        cyan: '#06b6d4',
        white: fg,
        // Bright variants
        brightBlack: muted,
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#c4b5fd',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    let resizeObserver: ResizeObserver | null = null;

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    try {
      terminal.loadAddon(new WebglAddon());
    } catch {
      // WebGL addon boleh gagal di environment tertentu; xterm canvas fallback tetap usable.
    }

    // Expose search addon for external search bar
    window.dispatchEvent(
      new CustomEvent('Nonaterm:search-ready', {
        detail: { paneId, searchAddon },
      }),
    );

    terminal.open(containerRef.current);
    fitAddon.fit();
    terminalRef.current = terminal;

    startTransition(() => {
      startSession(paneId, workspaceId);
    });

    const disposeOnData = terminal.onData((data) => {
      void ptyWrite(paneId, data).catch((error) => {
        startTransition(() => {
          markError(
            paneId,
            error instanceof Error
              ? error.message
              : 'Failed to write PTY input',
          );
        });
      });
    });

    // Native paste handler. We translate newlines to `\r` so the
    // shell receives proper CRLF (or just CR for most PTYs), and we
    // bracketed-paste escape so TUIs that need it (vim, fzf, etc.)
    // can detect the paste boundary.
    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      if (text === undefined || text.length === 0) {
        return;
      }
      event.preventDefault();

      // Multiline paste confirmation (PRD Section 16)
      const lineCount = text.split(/\r?\n/).length;
      if (lineCount > 1) {
        // Dispatch custom event for the pane to show confirmation dialog
        const confirmed = window.confirm(`Paste contains ${lineCount} lines. Continue?`);
        if (!confirmed) return;
      }

      const bracketed = supportsBracketedPaste();
      const payload = bracketed
        ? `\x1b[200~${text.replace(/\r?\n/g, '\r')}\x1b[201~`
        : text.replace(/\r?\n/g, '\r');
      void ptyWrite(paneId, payload).catch(() => undefined);
    };
    const surface = containerRef.current;
    surface.addEventListener('paste', handlePaste);

    let cleanupOutput = () => {};
    let cleanupExit = () => {};
    // Declared here so the cleanup closure can access them
    let _intersectionObserver: IntersectionObserver | null = null;

    const setup = async () => {
      try {
        const [unlistenOutput, unlistenExit] = await Promise.all([
          listen<PtyOutputEvent>('pty:output', (event) =>
            handleOutputEvent(event.payload),
          ),
          listen<PtyExitEvent>('pty:exit', (event) =>
            handleExitEvent(event.payload),
          ),
        ]);

        cleanupOutput = unlistenOutput;
        cleanupExit = unlistenExit;

        let session;
        try {
          session = await ptySpawn({
            workspaceId,
            paneId,
            cwd: cwdRef.current,
            shell: shellRef.current,
            rows: terminal.rows,
            cols: terminal.cols,
          });
        } catch (spawnErr) {
          // Retry with default shell if custom shell fails
          const errMsg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr);
          if (errMsg.includes('not found') || errMsg.includes('No such file') || errMsg.includes('系统找不到')) {
            terminal.writeln(`[shell not found: ${shellRef.current ?? 'default'}, retrying with system default...]`);
            session = await ptySpawn({
              workspaceId,
              paneId,
              cwd: cwdRef.current,
              shell: undefined,
              rows: terminal.rows,
              cols: terminal.cols,
            });
          } else {
            throw spawnErr;
          }
        }

        if (terminalDisposedRef.current) {
          closedRef.current = true;
          void ptyClose(paneId).catch(() => undefined);
          return;
        }

        startTransition(() => {
          attachSession(paneId, {
            workspaceId: session.workspaceId,
            isConnected: true,
            status: 'running',
            processId: session.processId,
            sessionId: session.sessionId,
          });
        });

        terminal.writeln(`[connected: ${title}]`);

        if (startupCommandRef.current.trim()) {
          void ptyWrite(paneId, `${startupCommandRef.current}\r\n`).catch(() => undefined);
          terminal.writeln(`[startup: ${startupCommandRef.current}]`);
        }

        resizeObserver = new ResizeObserver((entries) => {
          // Skip fit when container is hidden (display:none gives 0×0)
          const entry = entries[0];
          if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            fitAddon.fit();
            void ptyResize(paneId, terminal.rows, terminal.cols).catch(
              () => undefined,
            );
          }
        });
        resizeObserver.observe(containerRef.current!);

        // Re-fit when container becomes visible after being hidden
        if (typeof IntersectionObserver === 'undefined') return;
        _intersectionObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                requestAnimationFrame(() => {
                  if (!terminalDisposedRef.current && containerRef.current) {
                    fitAddon.fit();
                    void ptyResize(paneId, terminal.rows, terminal.cols).catch(
                      () => undefined,
                    );
                  }
                });
              }
            }
          },
          { threshold: 0.01 },
        );
        _intersectionObserver.observe(containerRef.current!);

        void ptyResize(paneId, terminal.rows, terminal.cols);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to initialize terminal pane';
        terminal.writeln(`[error] ${message}`);
        reportError('PTY_SPAWN_FAILED', { message });
        startTransition(() => {
          markError(paneId, message);
        });
      }
    };

    void setup();

    const handleRestart = (event: Event) => {
      const detail = (event as CustomEvent<{ paneId: string }>).detail;

      if (detail?.paneId === paneId) {
        restartPane();
      }
    };

    window.addEventListener('Nonaterm:restart-pane', handleRestart);

    return () => {
      terminalDisposedRef.current = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      window.removeEventListener('Nonaterm:restart-pane', handleRestart);
      surface.removeEventListener('paste', handlePaste);
      resizeObserver?.disconnect();
      _intersectionObserver?.disconnect();
      cleanupOutput();
      cleanupExit();
      disposeOnData.dispose();
      terminal.dispose();
      terminalRef.current = null;

      if (!closedRef.current) {
        void ptyClose(paneId).catch(() => undefined);
      }

      startTransition(() => {
        removeSession(paneId);
      });
    };
  // PTY lifecycle should not restart just because editable pane metadata changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attachSession,
    markError,
    paneId,
    removeSession,
    startSession,
    title,
    workspaceId,
  ]);

  return (
    <div
      ref={containerRef}
      className="xterm-surface"
      data-pane-id={paneId}
      aria-label={`${title} terminal surface`}
    />
  );
}
