import { useEffect, useState } from 'react';

/**
 * Inline Rendering panel (PRD Section 9 - Wave Terminal).
 * Shows rendered content (markdown, diffs, images) in a side panel
 * when detected in terminal output.
 */

type RenderedContent = {
  type: 'markdown' | 'diff' | 'image' | 'json';
  content: string;
  timestamp: number;
};

type InlineRendererProps = {
  paneId: string;
};

export function InlineRenderer({ paneId }: InlineRendererProps) {
  const [contents, setContents] = useState<RenderedContent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.paneId !== paneId) return;

      setContents((prev) => [
        ...prev.slice(-9), // keep last 10
        {
          type: detail.type || 'markdown',
          content: detail.content || '',
          timestamp: Date.now(),
        },
      ]);
    };

    window.addEventListener('Nonaterm:inline-content', handler);
    return () => window.removeEventListener('Nonaterm:inline-content', handler);
  }, [paneId]);

  if (contents.length === 0) return null;

  const current = contents[activeTab];

  return (
    <div className="inline-renderer">
      <button
        type="button"
        className="inline-renderer__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span aria-hidden="true">📄</span>
        <span>{contents.length} rendered</span>
      </button>
      {expanded && current ? (
        <div className="inline-renderer__panel">
          <div className="inline-renderer__tabs">
            {contents.slice(-5).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`inline-renderer__tab${i === activeTab ? ' inline-renderer__tab--active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {contents[i].type}
              </button>
            ))}
          </div>
          <div className="inline-renderer__content">
            {current.type === 'json' ? (
              <pre className="inline-renderer__pre">{current.content}</pre>
            ) : current.type === 'diff' ? (
              <pre className="inline-renderer__pre inline-renderer__pre--diff">{current.content}</pre>
            ) : (
              <div className="inline-renderer__markdown">{current.content}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
