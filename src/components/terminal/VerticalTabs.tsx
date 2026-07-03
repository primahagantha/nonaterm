import { useState } from 'react';
import { TerminalPanePlaceholder } from '@/components/terminal/TerminalPanePlaceholder';
import type { Workspace } from '@/types/workspace';

/**
 * Vertical Tabs layout (PRD Section 9 - Warp).
 * Alternative to grid layout: shows panes as vertical tabs,
 * one pane visible at a time. Good for focusing on one terminal.
 */
export function VerticalTabs({ workspace }: { workspace: Workspace }) {
  const [activeTab, setActiveTab] = useState(0);
  const panes = workspace.panes;

  if (panes.length === 0) return null;

  return (
    <div className="vertical-tabs">
      <nav className="vertical-tabs__nav" aria-label="Terminal tabs">
        {panes.map((pane, i) => (
          <button
            key={pane.id}
            type="button"
            className={`vertical-tabs__tab${i === activeTab ? ' vertical-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
            aria-selected={i === activeTab}
            role="tab"
          >
            <span className="vertical-tabs__tab-dot" style={{ background: workspace.accentColor }} />
            <span className="vertical-tabs__tab-name">{pane.title}</span>
          </button>
        ))}
      </nav>
      <div className="vertical-tabs__content" role="tabpanel">
        {panes[activeTab] ? (
          <TerminalPanePlaceholder
            key={panes[activeTab].id}
            workspaceId={workspace.id}
            paneId={panes[activeTab].id}
            title={panes[activeTab].title}
            cwd={panes[activeTab].cwd}
            startupCommand={panes[activeTab].startupCommand}
            defaultOpen={true}
            shell={panes[activeTab].shell}
          />
        ) : null}
      </div>
    </div>
  );
}
