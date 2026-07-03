import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauriRuntime, systemGetLogLines } from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import type { LogLine } from '@/types/ipc';

const LEVELS = ['', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const;

/** Panel log viewer dengan filter level dan auto-refresh. */
export function LogViewer() {
  const logVisible = useSettingsStore((s) => s.logVisible);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [level, setLevel] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!isTauriRuntime()) return;
    setLoading(true);
    try {
      const result = await systemGetLogLines(200, level || undefined);
      setLines(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    if (!open || !logVisible) return;
    void fetchLogs();
    const interval = window.setInterval(() => void fetchLogs(), 3000);
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [fetchLogs, open, logVisible]);

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current;
      const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [lines, open]);

  if (!logVisible) return null;

  return (
    <section className="log-viewer" aria-label="Log viewer">
      <button
        type="button"
        className="log-viewer__toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="log-viewer-panel"
      >
        {open ? '▼' : '▶'} Logs
        {lines.length > 0 ? ` (${lines.length})` : ''}
      </button>
      {open ? (
        <div id="log-viewer-panel" className="log-viewer__panel">
          <div className="log-viewer__toolbar">
            <label className="log-viewer__filter">
              Level:
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l || 'ALL'}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => void fetchLogs()}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div ref={listRef} className="log-viewer__list">
            {lines.length === 0 ? (
              <p className="log-viewer__empty">No log entries.</p>
            ) : (
              lines.map((line) => (
                <div
                  key={`${line.timestamp}-${line.target}-${line.message}`}
                  className={`log-viewer__line log-viewer__line--${line.level.toLowerCase()}`}
                >
                  <span className="log-viewer__time">{line.timestamp}</span>
                  <span className="log-viewer__level">{line.level}</span>
                  <span className="log-viewer__target">{line.target}</span>
                  <span className="log-viewer__msg">{line.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
