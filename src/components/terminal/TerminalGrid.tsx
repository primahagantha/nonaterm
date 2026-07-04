import { useMemo, useRef } from 'react';
import { TerminalPanePlaceholder } from '@/components/terminal/TerminalPanePlaceholder';
import { GridSplitter } from '@/components/terminal/GridSplitter';
import { VerticalTabs } from '@/components/terminal/VerticalTabs';
import { useUiStore } from '@/stores/uiStore';
import type { LayoutPreset, Workspace } from '@/types/workspace';
import type { CSSProperties, ReactNode, RefObject } from 'react';

const SPLITTER_SIZE = 'var(--tw-splitter-size)';

type TerminalGridProps = {
  workspace?: Workspace;
};

type LayoutConfig = {
  columns: number;
  rows: number;
  hasSplitter: boolean;
};

function configFor(paneCount: number): LayoutConfig {
  if (paneCount <= 1) return { columns: 1, rows: 1, hasSplitter: false };
  if (paneCount === 2) return { columns: 2, rows: 1, hasSplitter: true };
  if (paneCount <= 4) return { columns: 2, rows: 2, hasSplitter: true };
  if (paneCount <= 6) return { columns: 3, rows: 2, hasSplitter: true };
  return { columns: 3, rows: 3, hasSplitter: true };
}

const PRESET_OVERRIDE: Record<LayoutPreset, LayoutConfig> = {
  '1': { columns: 1, rows: 1, hasSplitter: false },
  '2': { columns: 2, rows: 1, hasSplitter: true },
  '4': { columns: 2, rows: 2, hasSplitter: true },
  '6': { columns: 3, rows: 2, hasSplitter: true },
  '9': { columns: 3, rows: 3, hasSplitter: true },
};

function defaultAxisSizes(trackCount: number): number[] {
  if (trackCount <= 1) return [];
  const ratio = 1 / trackCount;
  return Array.from({ length: trackCount - 1 }, () => ratio);
}

function buildAxisTemplate(
  trackCount: number,
  hasSplitter: boolean,
  sizes: number[],
): string {
  if (!hasSplitter || trackCount <= 1) {
    return trackCount === 1 ? '1fr' : `repeat(${trackCount}, minmax(0, 1fr))`;
  }
  const parts: string[] = [];
  for (let i = 0; i < trackCount; i++) {
    if (i > 0) parts.push(SPLITTER_SIZE);
    parts.push(`${sizes[i] ?? 1 / trackCount}fr`);
  }
  return parts.join(' ');
}

/**
 * Map pane index to explicit [gridColumn, gridRow] (1-indexed).
 * Splitters occupy the even-numbered tracks between content cells.
 *   Content col c → gridColumn = 2*c + 1
 *   Content row r → gridRow    = 2*r + 1
 */
function paneGridPosition(
  index: number,
  columns: number,
): { col: number; row: number } {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return { col: 2 * col + 1, row: 2 * row + 1 };
}

/** Placeholder grid yang nanti diisi xterm.js per pane. */
export function TerminalGrid({ workspace }: TerminalGridProps) {
  const viewMode = useUiStore((state) => state.viewMode);
  const containerRef = useRef<HTMLElement | null>(null);
  const paneSizes = useUiStore((state) => state.paneSizes);
  const panes = workspace?.panes ?? [];
  const layoutPreset = workspace?.layoutPreset ?? '1';
  const config = useMemo(
    () => PRESET_OVERRIDE[layoutPreset] ?? configFor(panes.length),
    [layoutPreset, panes.length],
  );
  const workspaceId = workspace?.id ?? 'workspace-unknown';

  // Vertical tabs mode
  if (viewMode === 'vertical-tabs' && workspace) {
    return <VerticalTabs workspace={workspace} />;
  }

  const stored = paneSizes[workspaceId];
  const colSizes =
    stored?.columns && stored.columns.length > 0
      ? stored.columns
      : defaultAxisSizes(config.columns);
  const rowSizes =
    stored?.rows && stored.rows.length > 0
      ? stored.rows
      : defaultAxisSizes(config.rows);

  const showSplitters = config.hasSplitter && panes.length > 1;

  const gridStyle: CSSProperties = {
    gridTemplateColumns: buildAxisTemplate(config.columns, showSplitters, colSizes),
    gridTemplateRows: buildAxisTemplate(config.rows, showSplitters, rowSizes),
    gap: '0',
  };

  // Total grid tracks including splitter tracks
  const totalCols = 2 * config.columns - 1;
  const totalRows = 2 * config.rows - 1;

  const items: ReactNode[] = [];

  // Place panes at explicit grid positions
  panes.forEach((pane, i) => {
    const isFirst = i === 0;
    const isMostRecent = i === panes.length - 1 && panes.length > 1;
    const defaultOpen = isFirst || isMostRecent;
    const pos = paneGridPosition(i, config.columns);

    items.push(
      <TerminalPanePlaceholder
        key={pane.id}
        workspaceId={workspaceId}
        paneId={pane.id}
        title={pane.title}
        cwd={pane.cwd}
        startupCommand={pane.startupCommand}
        defaultOpen={defaultOpen}
        shell={pane.shell}
        style={{ gridColumn: String(pos.col), gridRow: String(pos.row) }}
      />,
    );
  });

  // Place splitters
  if (showSplitters) {
    // Vertical splitters (between columns)
    for (let c = 0; c < config.columns - 1; c++) {
      items.push(
        <GridSplitter
          key={`vsplit-${workspaceId}-${c}`}
          workspaceId={workspaceId}
          axis="columns"
          index={c}
          containerRef={containerRef as RefObject<HTMLElement | null>}
          style={{ gridColumn: String(2 * c + 2), gridRow: `1 / ${totalRows + 1}` }}
        />,
      );
    }

    // Horizontal splitters (between rows)
    for (let r = 0; r < config.rows - 1; r++) {
      items.push(
        <GridSplitter
          key={`hsplit-${workspaceId}-${r}`}
          workspaceId={workspaceId}
          axis="rows"
          index={r}
          containerRef={containerRef as RefObject<HTMLElement | null>}
          style={{ gridColumn: `1 / ${totalCols + 1}`, gridRow: String(2 * r + 2) }}
        />,
      );
    }
  }

  return (
    <section
      ref={containerRef}
      className="terminal-grid"
      aria-label="Terminal grid"
      style={gridStyle}
    >
      {items}
    </section>
  );
}
