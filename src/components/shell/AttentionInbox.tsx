import { useMemo, useState } from 'react';
import { useTerminalStore } from '@/stores/terminalStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useFocusStore } from '@/stores/focusStore';

/**
 * Attention Inbox (PRD Section 11.1) — centralized list of terminals
 * that need attention: errored, exited with non-zero code, or idle
 * after running.
 */
export function AttentionInbox() {
  const sessions = useTerminalStore((s) => s.sessions);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const setActivePane = useFocusStore((s) => s.setActivePaneId);
  const [expanded, setExpanded] = useState(false);

  const attentionItems = useMemo(() => {
    const items: Array<{
      paneId: string;
      workspaceId: string;
      workspaceName: string;
      title: string;
      status: string;
      errorMessage?: string;
      exitCode?: number | null;
    }> = [];

    for (const ws of workspaces) {
      for (const pane of ws.panes) {
        const session = sessions[pane.id];
        if (!session) continue;
        if (session.status === 'error' || session.status === 'exited') {
          items.push({
            paneId: pane.id,
            workspaceId: ws.id,
            workspaceName: ws.name,
            title: pane.title,
            status: session.status,
            errorMessage: session.errorMessage,
            exitCode: session.exitCode,
          });
        }
      }
    }
    return items;
  }, [sessions, workspaces]);

  if (attentionItems.length === 0) return null;

  const handleClick = (workspaceId: string, paneId: string) => {
    setActiveWorkspace(workspaceId);
    setActivePane(paneId);
    setExpanded(false);
  };

  return (
    <div className="attention-inbox">
      <button
        type="button"
        className="attention-inbox__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${attentionItems.length} terminal${attentionItems.length > 1 ? 's' : ''} need attention`}
      >
        <span className="attention-inbox__badge">{attentionItems.length}</span>
        <span>Attention</span>
      </button>
      {expanded ? (
        <ul className="attention-inbox__list" role="list">
          {attentionItems.map((item) => (
            <li
              key={item.paneId}
              className={`attention-inbox__item attention-inbox__item--${item.status}`}
            >
              <button
                type="button"
                className="attention-inbox__item-btn"
                onClick={() => handleClick(item.workspaceId, item.paneId)}
              >
                <span className="attention-inbox__item-title">{item.title}</span>
                <span className="attention-inbox__item-workspace">{item.workspaceName}</span>
                <span className="attention-inbox__item-status">
                  {item.status === 'error'
                    ? `Error: ${item.errorMessage?.slice(0, 40) ?? 'unknown'}`
                    : `Exit ${item.exitCode ?? '?'}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
