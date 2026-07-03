import { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { ptyWrite } from '@/lib/tauri';

/**
 * Broadcast Input (PRD Section 11.2) — send one keystroke to
 * multiple selected terminals.
 */
export function BroadcastPanel({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === workspaceId),
  );
  const sessions = useTerminalStore((s) => s.sessions);
  const [selectedPanes, setSelectedPanes] = useState<Set<string>>(new Set());
  const [broadcastText, setBroadcastText] = useState('');
  const [sent, setSent] = useState(false);

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
    setSent(true);
    setTimeout(() => setSent(false), 2000);
    setBroadcastText('');
  };

  return (
    <div className="broadcast-panel">
      <div className="broadcast-panel__header">
        <span className="broadcast-panel__title">Broadcast Input</span>
        <button type="button" className="btn btn--sm btn--ghost" onClick={selectAll}>
          Select all
        </button>
      </div>
      <div className="broadcast-panel__panes">
        {runningPanes.map((pane) => (
          <label key={pane.id} className="broadcast-panel__pane">
            <input
              type="checkbox"
              checked={selectedPanes.has(pane.id)}
              onChange={() => togglePane(pane.id)}
            />
            <span>{pane.title}</span>
          </label>
        ))}
      </div>
      <div className="broadcast-panel__input-row">
        <input
          type="text"
          className="broadcast-panel__input"
          placeholder="Type command to broadcast..."
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleBroadcast();
          }}
          aria-label="Broadcast command"
        />
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={() => void handleBroadcast()}
          disabled={!broadcastText.trim() || selectedPanes.size === 0}
        >
          {sent ? 'Sent!' : `Send to ${selectedPanes.size}`}
        </button>
      </div>
    </div>
  );
}
