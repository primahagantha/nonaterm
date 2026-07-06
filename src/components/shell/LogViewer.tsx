import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTauriRuntime, systemGetLogLines } from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import type { LogLine } from '@/types/ipc';

const LEVELS = ['', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const;

/** Panel log viewer dengan filter level, search, export, dan auto-refresh. */
export function LogViewer() {
  const logVisible = useSettingsStore((s) => s.logVisible);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [level, setLevel] = useState<string>('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!isTauriRuntime()) return;
    setLoading(true);
    try {
      const result = await systemGetLogLines(500, level || undefined);
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
    if (open && autoScroll && listRef.current) {
      const el = listRef.current;
      const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [lines, open, autoScroll]);

  const filtered = useMemo(() => {
    if (!search.trim()) return lines;
    const q = search.toLowerCase();
    return lines.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q),
    );
  }, [lines, search]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
    for (const l of lines) {
      counts[l.level] = (counts[l.level] || 0) + 1;
    }
    return counts;
  }, [lines]);

  const handleExport = () => {
    const text = filtered
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.target}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nonaterm-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        {levelCounts.ERROR > 0 ? (
          <span className="log-viewer__badge log-viewer__badge--error">{levelCounts.ERROR} err</span>
        ) : null}
        {levelCounts.WARN > 0 ? (
          <span className="log-viewer__badge log-viewer__badge--warn">{levelCounts.WARN} warn</span>
        ) : null}
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
            <input
              type="text"
              className="log-viewer__search"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search log entries"
            />
            <label className="log-viewer__autoscroll">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={handleExport}
              title="Export visible logs"
            >
              Export
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => void fetchLogs()}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="log-viewer__counts">
            <span className="log-viewer__count log-viewer__count--error">ERROR: {levelCounts.ERROR}</span>
            <span className="log-viewer__count log-viewer__count--warn">WARN: {levelCounts.WARN}</span>
            <span className="log-viewer__count log-viewer__count--info">INFO: {levelCounts.INFO}</span>
            <span className="log-viewer__count log-viewer__count--debug">DEBUG: {levelCounts.DEBUG}</span>
            <span className="log-viewer__count">Total: {lines.length}</span>
            {search ? <span className="log-viewer__count">Filtered: {filtered.length}</span> : null}
          </div>
          <div ref={listRef} className="log-viewer__list">
            {filtered.length === 0 ? (
              <p className="log-viewer__empty">No log entries.</p>
            ) : (
              filtered.map((line) => (
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
