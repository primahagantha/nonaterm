import { useCallback, useRef } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { useUiStore } from '@/stores/uiStore';

const MIN_RATIO = 0.1;
const MAX_RATIO = 0.9;

type GridSplitterProps = {
  workspaceId: string;
  axis: 'columns' | 'rows';
  index: number;
  containerRef: RefObject<HTMLElement | null>;
  style?: CSSProperties;
};

/** Draggable divider between terminal panes for manual grid resizing. */
export function GridSplitter({
  workspaceId,
  axis,
  index,
  containerRef,
  style,
}: GridSplitterProps) {
  const setPaneSize = useUiStore((state) => state.setPaneSize);
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      draggingRef.current = true;
      document.body.style.userSelect = 'none';

      const handleMouseMove = (e: MouseEvent) => {
        if (!draggingRef.current) return;
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const ratio =
          axis === 'columns'
            ? (e.clientX - rect.left) / rect.width
            : (e.clientY - rect.top) / rect.height;

        const clamped = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
        setPaneSize(workspaceId, axis, index, clamped);
      };

      const handleMouseUp = () => {
        draggingRef.current = false;
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [workspaceId, axis, index, containerRef, setPaneSize],
  );

  const orientation = axis === 'columns' ? 'vertical' : 'horizontal';

  return (
    <div
      className={`grid-splitter grid-splitter--${orientation}`}
      role="separator"
      aria-orientation={orientation}
      onMouseDown={handleMouseDown}
      style={style}
    />
  );
}
