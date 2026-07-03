import { useEffect, useState, useRef } from 'react';

/**
 * Blocks-based output overlay (PRD Section 9 - Warp).
 * Groups command + output into collapsible blocks.
 * Tracks command boundaries by detecting prompt patterns.
 */

type CommandBlock = {
  id: number;
  command: string;
  timestamp: number;
  collapsed: boolean;
  exitCode?: number;
};

type BlockOverlayProps = {
  paneId: string;
  onToggleBlock: (id: number) => void;
};

export function BlockOverlay({ paneId, onToggleBlock }: BlockOverlayProps) {
  const [blocks, setBlocks] = useState<CommandBlock[]>([]);
  const blockIdRef = useRef(0);

  // Listen for command execution events
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.paneId !== paneId) return;

      if (detail.type === 'command') {
        blockIdRef.current += 1;
        setBlocks((prev) => [
          ...prev,
          {
            id: blockIdRef.current,
            command: detail.command,
            timestamp: Date.now(),
            collapsed: false,
          },
        ]);
      } else if (detail.type === 'exit') {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockIdRef.current
              ? { ...b, exitCode: detail.exitCode }
              : b,
          ),
        );
      }
    };

    window.addEventListener('Nonaterm:block-event', handler);
    return () => window.removeEventListener('Nonaterm:block-event', handler);
  }, [paneId]);

  if (blocks.length === 0) return null;

  return (
    <div className="block-overlay" aria-label="Command blocks">
      <div className="block-overlay__header">
        <span className="block-overlay__count">{blocks.length} commands</span>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => setBlocks((prev) => prev.map((b) => ({ ...b, collapsed: true })))}
        >
          Collapse all
        </button>
      </div>
      <div className="block-overlay__list">
        {blocks.slice(-10).map((block) => (
          <div
            key={block.id}
            className={`block-overlay__block ${block.collapsed ? 'block-overlay__block--collapsed' : ''}`}
          >
            <button
              type="button"
              className="block-overlay__toggle"
              onClick={() => {
                setBlocks((prev) =>
                  prev.map((b) =>
                    b.id === block.id ? { ...b, collapsed: !b.collapsed } : b,
                  ),
                );
                onToggleBlock(block.id);
              }}
              aria-expanded={!block.collapsed}
            >
              <span className="block-overlay__arrow">{block.collapsed ? '▶' : '▼'}</span>
              <span className="block-overlay__cmd">{block.command}</span>
              {block.exitCode !== undefined ? (
                <span className={`block-overlay__exit ${block.exitCode === 0 ? 'block-overlay__exit--ok' : 'block-overlay__exit--fail'}`}>
                  exit {block.exitCode}
                </span>
              ) : null}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
