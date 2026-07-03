import { useEffect, useRef, useState } from 'react';
import {
  systemRunCrashSimulation,
  systemRunMultiSpawnProbe,
  systemRunPerfProbe,
  type CrashScenarioInput,
} from '@/lib/tauri';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { TOOL_PRESETS } from '@/components/modals/toolPresets';

/** Quick-launch presets shown directly in the toolbar. */
const QUICK_LAUNCH_IDS = ['opencode', 'claude', 'codex'];

export function TerminalLauncher() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const customTools = useSettingsStore((s) => s.customTools);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const flashMessage = (text: string) => {
    setError(null);
    setMessage(text);
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = window.setTimeout(() => {
      setMessage(null);
      messageTimerRef.current = null;
    }, 4000);
  };

  const flashError = (text: string) => {
    setMessage(null);
    setError(text);
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = window.setTimeout(() => {
      setError(null);
      messageTimerRef.current = null;
    }, 6000);
  };

  const handleOpenConfigModal = () => {
    useUiStore.getState().openTerminalConfigModal();
  };

  const handleQuickLaunch = (toolId: string) => {
    const tool = TOOL_PRESETS.find((t) => t.id === toolId);
    if (!tool) return;
    createWorkspace(tool.name, tool.color, undefined, tool.command);
  };

  const handleCustomQuickLaunch = (tool: { name: string; command: string; color: string }) => {
    createWorkspace(tool.name, tool.color, undefined, tool.command);
  };

  const handlePerfProbe = async () => {
    try {
      const result = await systemRunPerfProbe();
      flashMessage(
        `Perf probe: ${result.spawnMs} ms via ${result.shell} (${result.shellSource})`,
      );
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Perf probe failed.');
    }
  };

  const handleMultiSpawnProbe = async () => {
    try {
      const result = await systemRunMultiSpawnProbe(9, 24, 80);
      flashMessage(
        `${result.panes} panes in ${result.totalSpawnMs} ms (avg ${result.avgSpawnMs} ms, p95 ${result.p95SpawnMs} ms, RSS Δ ${formatBytes(result.rssDeltaBytes ?? null)})${result.withinBudget ? ' ✓' : ' ✗ over budget'}`,
      );
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Multi-spawn probe failed.');
    }
  };

  const handleCrashProbe = async () => {
    const scenarios: CrashScenarioInput[] = [
      { scenario: 'process-exits-immediately', count: 1 },
      { scenario: 'broken-pipe-on-read', count: 1 },
      { scenario: 'panic-during-output', count: 1 },
      { scenario: 'resize-invalid', count: 1 },
    ];
    try {
      const result = await systemRunCrashSimulation(scenarios);
      const s = result.summary;
      flashMessage(
        `Crash probe OK · ${result.consumed.length} scenarios · panics ${s.panicsCaught}, broken-pipes ${s.readBrokenPipe}, resize-fail ${s.resizeInvalid}`,
      );
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Crash probe failed.');
    }
  };

  function formatBytes(bytes: number | null): string {
    if (bytes === null || bytes === undefined) {
      return 'n/a';
    }
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const quickLaunchPresets = TOOL_PRESETS.filter((t) => QUICK_LAUNCH_IDS.includes(t.id));

  return (
    <section className="terminal-launcher" aria-label="Terminal launcher">
      <div className="terminal-launcher__row">
        <button
          className="btn btn--primary btn--sm terminal-launcher__btn"
          type="button"
          onClick={handleOpenConfigModal}
          title="Add terminal pane"
          data-testid="launcher-add-pane"
        >
          <span aria-hidden="true">+</span>
          Add Pane
        </button>
        {quickLaunchPresets.map((tool) => (
          <button
            key={tool.id}
            className="btn btn--sm btn--ghost terminal-launcher__btn terminal-launcher__quick"
            type="button"
            onClick={() => handleQuickLaunch(tool.id)}
            title={`Quick launch ${tool.name}`}
            style={{ '--ql-color': tool.color } as React.CSSProperties}
          >
            <span className="terminal-launcher__quick-icon">{tool.icon}</span>
            {tool.name}
          </button>
        ))}
        {customTools.map((tool) => (
          <button
            key={tool.id}
            className="btn btn--sm btn--ghost terminal-launcher__btn terminal-launcher__quick"
            type="button"
            onClick={() => handleCustomQuickLaunch(tool)}
            title={`Quick launch ${tool.name}`}
            style={{ '--ql-color': tool.color } as React.CSSProperties}
          >
            <span className="terminal-launcher__quick-icon">{tool.icon}</span>
            {tool.name}
          </button>
        ))}
        <button
          className="btn btn--sm btn--ghost terminal-launcher__btn"
          type="button"
          onClick={() => useUiStore.getState().openFastLaunchModal()}
          title="More tools and options"
        >
          ⚡ More…
        </button>
      </div>
      {import.meta.env.DEV ? (
        <div className="terminal-launcher__row terminal-launcher__row--meta">
          <button
            className="btn btn--sm btn--ghost terminal-launcher__btn terminal-launcher__btn--meta"
            type="button"
            onClick={() => void handlePerfProbe()}
            title="Run a single PTY spawn to measure cold-start latency"
            data-testid="launcher-perf-probe"
          >
            Perf Probe
          </button>
          <button
            className="btn btn--sm btn--ghost terminal-launcher__btn terminal-launcher__btn--meta"
            type="button"
            onClick={() => void handleMultiSpawnProbe()}
            title="Spawn 9 PTY sessions sequentially to measure 9-pane cold start"
            data-testid="launcher-multi-probe"
          >
            Multi Probe (9)
          </button>
          <button
            className="btn btn--sm btn--ghost terminal-launcher__btn terminal-launcher__btn--meta"
            type="button"
            onClick={() => void handleCrashProbe()}
            title="Inject synthetic crash scenarios (broken pipe, panic, etc)"
            data-testid="launcher-crash-probe"
          >
            Crash Probe
          </button>
          {message ? (
            <span className="terminal-launcher__msg" role="status">
              {message}
            </span>
          ) : null}
          {error ? (
            <span className="terminal-launcher__error" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
