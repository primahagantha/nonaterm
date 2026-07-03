import { useRef, useState, useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { pickFolder } from '@/lib/tauri';
import { ToolPresetCard } from './ToolPresetCard';
import { CustomToolForm } from './CustomToolForm';
import { TOOL_PRESETS, SHELL_PRESETS } from './toolPresets';
import type { WorkspacePane } from '@/types/workspace';

type FastLaunchModalProps = {
  onLaunch?: (toolId: string, cwd: string) => void;
};

/**
 * Fast launch modal for quickly spawning terminals with CLI tool presets.
 */
export function FastLaunchModal({ onLaunch }: FastLaunchModalProps) {
  const {
    fastLaunchModalOpen: open,
    closeFastLaunchModal: close,
  } = useUiStore();
  const { createWorkspace, addPanesBatch, workspaces } = useWorkspaceStore();
  const customTools = useSettingsStore((s) => s.customTools);
  const addCustomTool = useSettingsStore((s) => s.addCustomTool);
  const removeCustomTool = useSettingsStore((s) => s.removeCustomTool);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedShell, setSelectedShell] = useState<string>('default');
  const [cwd, setCwd] = useState('');
  const [paneCount, setPaneCount] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setSelectedTool(null);
      setSelectedShell('default');
      setCwd('');
      setPaneCount(1);
      setIsLaunching(false);
      setError(null);
      setShowCustomForm(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleBrowseFolder = async () => {
    try {
      const folder = await pickFolder();
      if (folder) setCwd(folder);
    } catch {
      // ignore
    }
  };

  const handleUseActiveWorkspace = () => {
    const active = workspaces.find(w => w.id === useWorkspaceStore.getState().activeWorkspaceId);
    if (active?.panes[0]?.cwd) {
      setCwd(active.panes[0].cwd);
    }
  };

  const handleLaunch = async () => {
    if (!selectedTool) return;

    const tool = TOOL_PRESETS.find((t) => t.id === selectedTool);
    if (!tool) return;

    const shellPreset = SHELL_PRESETS.find((s) => s.id === selectedShell);
    const shell = shellPreset?.command || undefined;

    setIsLaunching(true);
    setError(null);

    try {
      if (tool.id === '9router') {
        // 9-pane: 1 router + 8 workers
        createWorkspace('9router Cluster', tool.color, cwd.trim() || undefined, 'router', shell);
        const ws = useWorkspaceStore.getState().workspaces;
        const created = ws[ws.length - 1];
        if (created) {
          const extraPanes: WorkspacePane[] = Array.from({ length: 8 }, (_, i) => ({
            id: `${created.id}-worker-${i + 1}`,
            title: `Worker ${i + 1}`,
            cwd: cwd.trim() || '',
            startupCommand: 'enowxai start',
            ...(shell ? { shell } : {}),
          }));
          addPanesBatch(created.id, extraPanes);
        }
      } else if (paneCount > 1) {
        // Multi-pane: create workspace with N panes of same tool
        createWorkspace(`${tool.name} x${paneCount}`, tool.color, cwd.trim() || undefined, tool.command, shell);
        const ws = useWorkspaceStore.getState().workspaces;
        const created = ws[ws.length - 1];
        if (created && paneCount > 1) {
          const extraPanes: WorkspacePane[] = Array.from({ length: paneCount - 1 }, (_, i) => ({
            id: `${created.id}-pane-${i + 2}`,
            title: `${tool.name} ${i + 2}`,
            cwd: cwd.trim() || '',
            startupCommand: tool.command,
            ...(shell ? { shell } : {}),
          }));
          addPanesBatch(created.id, extraPanes);
        }
      } else {
        // Single pane
        createWorkspace(tool.name, tool.color, cwd.trim() || undefined, tool.command, shell);
      }

      onLaunch?.(selectedTool, cwd.trim());
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to launch';
      setError(message);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div
      className="modal-backdrop modal-backdrop--enhanced"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        className="modal-dialog modal-dialog--lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fast-launch-title"
      >
        <div className="modal-header">
          <h2 id="fast-launch-title" className="modal-header__title">
            Quick launch
          </h2>
          <button type="button" className="modal-header__close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (selectedTool && !isLaunching) void handleLaunch(); }}>
          <div className="modal-body">
            {/* Working directory */}
            <div className="modal-field">
              <label htmlFor="fast-launch-folder" className="modal-field__label">
                Working directory
              </label>
              <div className="fast-launch__cwd-row">
                <input
                  id="fast-launch-folder"
                  type="text"
                  className="modal-field__input"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="Leave empty for default"
                />
                <button type="button" className="btn btn--sm btn--secondary" onClick={() => void handleBrowseFolder()}>
                  Browse
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={handleUseActiveWorkspace} title="Use active workspace folder">
                  Use current
                </button>
              </div>
            </div>

            {/* Shell + Pane count */}
            <div className="fast-launch__row">
              <div className="modal-field fast-launch__field--shell">
                <label htmlFor="fast-launch-shell" className="modal-field__label">Shell</label>
                <select
                  id="fast-launch-shell"
                  className="modal-field__input"
                  value={selectedShell}
                  onChange={(e) => setSelectedShell(e.target.value)}
                >
                  {SHELL_PRESETS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-field" style={{ width: 100 }}>
                <label htmlFor="fast-launch-panes" className="modal-field__label">Panes</label>
                <select
                  id="fast-launch-panes"
                  className="modal-field__input"
                  value={paneCount}
                  onChange={(e) => setPaneCount(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tool presets */}
            <div className="modal-field">
              <label className="modal-field__label">Select tool</label>
              {showCustomForm ? (
                <CustomToolForm
                  onSubmit={(tool) => {
                    addCustomTool(tool);
                    setShowCustomForm(false);
                  }}
                  onCancel={() => setShowCustomForm(false)}
                />
              ) : (
                <>
                  <div className="tool-presets">
                    {customTools.map((tool) => (
                      <ToolPresetCard
                        key={tool.id}
                        preset={{ id: tool.id, name: tool.name, command: tool.command, icon: tool.icon, color: tool.color, description: tool.description }}
                        selected={selectedTool === tool.id}
                        onSelect={() => setSelectedTool(tool.id)}
                        onRemove={() => removeCustomTool(tool.id)}
                        custom
                      />
                    ))}
                    {TOOL_PRESETS.map((preset) => (
                      <ToolPresetCard
                        key={preset.id}
                        preset={preset}
                        selected={selectedTool === preset.id}
                        onSelect={() => setSelectedTool(preset.id)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setShowCustomForm(true)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Add custom tool
                  </button>
                </>
              )}
            </div>
          </div>

          {error ? (
            <div className="modal-body">
              <p className="modal-field__error" role="alert">{error}</p>
            </div>
          ) : null}

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={close} disabled={isLaunching}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!selectedTool || isLaunching}>
              {isLaunching ? 'Launching…' : `Launch${paneCount > 1 ? ` ×${paneCount}` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
