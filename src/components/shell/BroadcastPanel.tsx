import { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { ptyWrite } from '@/lib/tauri';

export function BroadcastPanel({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === workspaceId),
  );
  const sessions = useTerminalStore((s) => s.sessions);
  const [selectedPanes, setSelectedPanes] = useState<Set<string>>(new Set());
  const [broadcastText, setBroadcastText] = useState('');
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  if (!workspace) return null;

  const runningPanes = workspace.panes.filter((p) => {
    const status = sessions[p.id]?.status;
    return status === 'running';
  });

  if (runningPanes.length < 2) return null;

  const togglePane = (paneId: string) => {
    setSelectedPanes((prev) => {
      const next = new Set(prev);
      if (next.has(paneId)) next.delete(paneId);
      else next.add(paneId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPanes(new Set(runningPanes.map((p) => p.id)));
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim() || selectedPanes.size === 0) return;
    const payload = `${broadcastText}\r\n`;
    await Promise.all(
      Array.from(selectedPanes).map((paneId) =>
        ptyWrite(paneId, payload).catch(() => undefined),
      ),
    );
    setHistory((prev) => [broadcastText, ...prev].slice(0, 20));
    setSent(true);
    setTimeout(() => setSent(false), 2000);
    setBroadcastText('');
  };

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <span className="settings-card__icon">📡</span>
        <div>
          <h3 className="settings-card__title">Broadcast Input</h3>
          <p className="settings-card__desc">Send one command to multiple terminals simultaneously.</p>
        </div>
      </div>
      <div className="settings-card__body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="settings-label">Target Panes ({selectedPanes.size}/{runningPanes.length} selected)</span>
          <button type="button" className="btn btn--sm btn--ghost" onClick={selectAll}>Select all</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {runningPanes.map((pane) => (
            <label key={pane.id} className="settings-toggle" style={{ fontSize: '0.8rem' }}>
              <input type="checkbox" checked={selectedPanes.has(pane.id)} onChange={() => togglePane(pane.id)} />
              <span className="settings-toggle__track"><span className="settings-toggle__thumb" /></span>
              <span className="settings-toggle__label">{pane.title}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="settings-input"
            style={{ flex: 1, maxWidth: 'none' }}
            placeholder="Type command to broadcast..."
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleBroadcast(); }}
            aria-label="Broadcast command"
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void handleBroadcast()}
            disabled={!broadcastText.trim() || selectedPanes.size === 0}
          >
            {sent ? '✓ Sent!' : `Send to ${selectedPanes.size}`}
          </button>
        </div>

        {history.length > 0 ? (
          <div style={{ marginTop: '0.75rem' }}>
            <span className="settings-label">History</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
              {history.map((cmd, i) => (
                <button
                  key={`${cmd}-${i}`}
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setBroadcastText(cmd)}
                  style={{ fontSize: '0.75rem', fontFamily: 'var(--tw-font-mono)' }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
