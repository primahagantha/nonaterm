import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { parseTokenOutput, formatTokenCount } from '@/lib/tokenParser';

/**
 * Token/Cost Meter (PRD Section 11.3) — displays estimated token
 * usage from AI agent CLI output in the workspace header.
 * Parses lines like "Tokens: 1,234 in / 5,678 out" from terminal output.
 */
export function TokenMeter({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === workspaceId),
  );
  const [tokens, setTokens] = useState({ input: 0, output: 0 });

  // Listen for PTY output events and parse token counts
  useEffect(() => {
    if (!workspace) return;

    const handleOutput = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.text) return;

      // Check if this output is from a pane in this workspace
      const isWorkspacePane = workspace.panes.some((p) => p.id === detail.paneId);
      if (!isWorkspacePane) return;

      // Parse each line for token output
      const lines = detail.text.split('\n');
      for (const line of lines) {
        const parsed = parseTokenOutput(line);
        if (parsed) {
          setTokens((prev) => ({
            input: prev.input + parsed.input,
            output: prev.output + parsed.output,
          }));
        }
      }
    };

    window.addEventListener('Nonaterm:pty-output', handleOutput);
    return () => window.removeEventListener('Nonaterm:pty-output', handleOutput);
  }, [workspace]);

  if (tokens.input === 0 && tokens.output === 0) return null;

  return (
    <div className="token-meter" title={`Estimated: ${tokens.input} in / ${tokens.output} out tokens`}>
      <span className="token-meter__icon" aria-hidden="true">⚡</span>
      <span className="token-meter__value">{formatTokenCount(tokens.input + tokens.output)}</span>
    </div>
  );
}
