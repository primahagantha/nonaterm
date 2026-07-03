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
  rowTemplate: number;
  colTemplate: number;
};

function configFor(paneCount: number): LayoutConfig {
  if (paneCount <= 1) {
    return { columns: 1, rows: 1, hasSplitter: false, rowTemplate: 1, colTemplate: 1 };
  }
  if (paneCount === 2) {
    return { columns: 2, rows: 1, hasSplitter: true, rowTemplate: 1, colTemplate: 2 };
  }
  if (paneCount <= 4) {
    return { columns: 2, rows: 2, hasSplitter: true, rowTemplate: 2, colTemplate: 2 };
  }
  if (paneCount <= 6) {
    return { columns: 3, rows: 2, hasSplitter: true, rowTemplate: 2, colTemplate: 3 };
  }
  return { columns: 3, rows: 3, hasSplitter: true, rowTemplate: 3, colTemplate: 3 };
}

const PRESET_OVERRIDE: Record<LayoutPreset, LayoutConfig> = {
  '1': { columns: 1, rows: 1, hasSplitter: false, rowTemplate: 1, colTemplate: 1 },
  '2': { columns: 2, rows: 1, hasSplitter: true, rowTemplate: 1, colTemplate: 2 },
  '4': { columns: 2, rows: 2, hasSplitter: true, rowTemplate: 2, colTemplate: 2 },
  '6': { columns: 3, rows: 2, hasSplitter: true, rowTemplate: 2, colTemplate: 3 },
  '9': { columns: 3, rows: 3, hasSplitter: true, rowTemplate: 3, colTemplate: 3 },
};

function defaultAxisSizes(trackCount: number): number[] {
  if (trackCount <= 1) return [];
  const ratio = 1 / trackCount;
  return Array.from({ length: trackCount - 1 }, () => ratio);
}

function buildColumnTemplate(
  columns: number,
  hasSplitter: boolean,
  colSizes: number[],
): string {
  if (!hasSplitter || columns <= 1) {
    return `repeat(${columns}, minmax(0, 1fr))`;
  }
  if (columns === 2) {
    const first = colSizes[0] ?? 0.5;
    const rest = 1 - first;
    return `${first}fr ${SPLITTER_SIZE} ${rest}fr`;
  }
  // 3 columns: distribute evenly with splitters between
  const third = 1 / 3;
  return `${third}fr ${SPLITTER_SIZE} ${third}fr ${SPLITTER_SIZE} ${third}fr`;
}

function buildRowTemplate(
  rows: number,
  hasSplitter: boolean,
  rowSizes: number[],
): string {
  if (!hasSplitter || rows <= 1) {
    return rows === 1 ? '1fr' : `repeat(${rows}, minmax(0, 1fr))`;
  }
  const first = rowSizes[0] ?? 1 / rows;
  const rest = 1 - first;
  return `${first}fr ${SPLITTER_SIZE} ${rest}fr`;
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
    gridTemplateColumns: buildColumnTemplate(
      config.columns,
      showSplitters,
      colSizes,
    ),
    gridTemplateRows: buildRowTemplate(
      config.rows,
      showSplitters,
      rowSizes,
    ),
    gap: '0',
  };

  const items: ReactNode[] = [];

  panes.forEach((pane, i) => {
    // Always open the first pane. For the rest, only auto-open the
    // most recently added pane — the user just clicked "Add Pane"
    // and expects to see the new terminal surface. Other panes start
    // closed and can be opened by clicking ▷.
    const isFirst = i === 0;
    const isMostRecent = i === panes.length - 1 && panes.length > 1;
    const defaultOpen = isFirst || isMostRecent;
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
      />,
    );

    if (showSplitters) {
      // Vertical splitters between columns
      if (config.columns === 2 && i === 0) {
        const vStyle: CSSProperties =
          config.rows === 2
            ? { gridColumn: '2', gridRow: '1 / 4' }
            : { gridColumn: '2', gridRow: '1' };
        items.push(
          <GridSplitter
            key={`vsplit-${workspaceId}-0`}
            workspaceId={workspaceId}
            axis="columns"
            index={0}
            containerRef={containerRef as RefObject<HTMLElement | null>}
            style={vStyle}
          />,
        );
      }

      if (config.columns === 3 && i === 0) {
        // First vertical splitter (between col 1 and 2)
        items.push(
          <GridSplitter
            key={`vsplit-${workspaceId}-0`}
            workspaceId={workspaceId}
            axis="columns"
            index={0}
            containerRef={containerRef as RefObject<HTMLElement | null>}
            style={{ gridColumn: '2', gridRow: `1 / ${config.rows * 2 + 1}` }}
          />,
        );
      }

      if (config.columns === 3 && i === 1) {
        // Second vertical splitter (between col 2 and 3)
        items.push(
          <GridSplitter
            key={`vsplit-${workspaceId}-1`}
            workspaceId={workspaceId}
            axis="columns"
            index={1}
            containerRef={containerRef as RefObject<HTMLElement | null>}
            style={{ gridColumn: '4', gridRow: `1 / ${config.rows * 2 + 1}` }}
          />,
        );
      }

      // Horizontal splitter between rows
      if (config.rows === 2 && i === 1 && panes.length > 2) {
        items.push(
          <GridSplitter
            key={`hsplit-${workspaceId}`}
            workspaceId={workspaceId}
            axis="rows"
            index={0}
            containerRef={containerRef as RefObject<HTMLElement | null>}
            style={{ gridColumn: `1 / ${config.columns * 2}`, gridRow: '2' }}
          />,
        );
      }

      if (config.rows === 3 && i === 5 && panes.length > 6) {
        // Horizontal splitter between row 2 and 3 for 9-pane
        items.push(
          <GridSplitter
            key={`hsplit-${workspaceId}-1`}
            workspaceId={workspaceId}
            axis="rows"
            index={1}
            containerRef={containerRef as RefObject<HTMLElement | null>}
            style={{ gridColumn: `1 / ${config.columns * 2}`, gridRow: '4' }}
          />,
        );
      }
    }
  });

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
