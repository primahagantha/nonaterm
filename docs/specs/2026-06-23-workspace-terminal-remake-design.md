# Workspace & Terminal Creation Remake — Design Spec

**Date**: 2026-06-23
**Status**: Approved
**Approach**: Phased Migration (3 phases)

## Decisions

| Decision | Choice |
|----------|--------|
| Creation flow | Multi-step Wizard (5 steps) |
| Layout selection | Hybrid — wizard picks layout, all panes same shell+cmd; post-create customize per-pane |
| Startup command injection | Hybrid backend — `pty_spawn` accepts `startup_command`, backend writes to PTY master after 150ms delay |
| Templates & entry points | Wizard absorbs everything — 6 old entry points deleted, templates become wizard presets |
| Terminal pane redesign | Full pane lifecycle UI (header, placeholder, split, error, restart) |
| Grid system | Full grid overhaul — universal splitters, layout switcher, maximize/restore, keyboard nav, drag-to-swap |
| Implementation approach | Phased — Phase 1 (backend + wizard), Phase 2 (pane redesign), Phase 3 (grid redesign) |

---

## Phase 1: Backend `pty_spawn` + Wizard

### 1.1 Backend: `pty_spawn` accept `startup_command`

#### Rust changes

**`src-tauri/src/commands/pty.rs`**:
- `pty_spawn`: add `startup_command: Option<String>` parameter
- Pass to `spawn_session`
- `PtySessionInfo`: add `startup_command: Option<String>` field

**`src-tauri/src/pty/manager.rs`**:
- `spawn_session`: accept `startup_command: Option<String>`
- `spawn_session_with_spec`: accept `startup_command: Option<String>`
- After child spawn + reader thread + exit watcher, spawn dedicated thread:
  1. If `startup_command` is Some and non-empty:
  2. Sleep 150ms (shell init)
  3. `writer.write_all(format!("{startup_command}\r\n").as_bytes())`
  4. `writer.flush()`
  5. Log: `tracing::info!(pane_id, "Injected startup command")`
- `restart_session`: read `startup_command` from session snapshot → pass to respawn (fixes auto-restart bug)

**`src-tauri/src/pty/session.rs`**:
- `PtySession`: add `startup_command: Option<String>` field

**`src-tauri/src/pty/mod.rs`**:
- `PtySessionSnapshot`: add `startup_command: Option<String>` field

#### Frontend type changes

**`src/types/terminal.ts`**:
```ts
type PtySpawnRequest = {
  workspaceId: string;
  paneId: string;
  shell?: string;
  cwd?: string;
  startupCommand?: string;  // NEW
  rows?: number;
  cols?: number;
};

type PtySessionInfo = {
  sessionId: string;
  workspaceId: string;
  paneId: string;
  shell: string;
  cwd: string;
  rows: number;
  cols: number;
  processId?: number;
  startupCommand?: string;  // NEW
};
```

#### Frontend `XtermTerminal.tsx` cleanup
- Remove `ptyWrite(paneId, startupCommand + \r\n)` block (line ~339-342)
- Remove manual restart re-inject (line ~205-208)
- Remove auto-restart re-inject (line ~132-163)
- Pass `startupCommand` to `ptySpawn()` call instead
- Keep `terminal.writeln('[startup: ...]')` as visual indicator (optional)

### 1.2 Wizard Component: `CreateWorkspaceWizard.tsx`

#### 5-step wizard

**Step 1 — Folder & Name**:
- Workspace name (auto-derived from folder name, editable)
- Working folder input + Browse button (`pickFolder()`)
- Template selection: Blank, Frontend Dev, Backend Dev, Import file…
- Template pre-fills steps 2-4

**Step 2 — Shell**:
- Radio list from `SHELL_PRESETS`: PowerShell, PowerShell 7, CMD, Git Bash, WSL, Default, Custom
- Custom → text input for path
- Pre-filled if template selected

**Step 3 — Tool/Command**:
- Grid of `TOOL_PRESETS` (8 tools: opencode, claude, agy, pi, cline, codex, qwen, aider)
- Selecting tool sets custom command field to tool.command
- Custom command text field (can override, can be empty)
- Quick Launch (Ctrl+K) opens wizard directly at step 3 with defaults pre-filled

**Step 4 — Layout**:
- 5 buttons: 1, 2, 4, 6, 9 with mini-grid preview
- All panes use same shell + command (hybrid)
- Post-create, user customizes per-pane via pane header

**Step 5 — Review**:
- Summary of all choices
- "Create Workspace" button

#### Wizard state (`uiStore.ts`)

```ts
type WizardStep = 0 | 1 | 2 | 3 | 4;

type CreateWizardState = {
  open: boolean;
  step: WizardStep;
  name: string;
  folder: string;
  template: 'blank' | 'frontend' | 'backend' | 'import' | null;
  importPath: string | null;
  shell: string;
  customShell: string;
  toolId: string | null;
  customCommand: string;
  layout: LayoutPreset;
};
```

Actions: `openWizard(step?)`, `closeWizard()`, `setWizardStep(step)`, `setWizardField(field, value)`, `resetWizard()`

#### `createWorkspace` signature change

```ts
createWorkspace: (
  name: string,
  accentColor?: string,
  cwd?: string,
  startupCommand?: string,
  shell?: string,
  layout?: LayoutPreset,
) => void;
```

Implementation creates N panes based on layout (1/2/4/6/9), all with same shell + command + cwd. Pane titles auto-generated from command (first token) or "Pane N".

#### Entry points replaced

| Old | New |
|-----|-----|
| `CreateWorkspaceModal.tsx` | Deleted — wizard replaces |
| `FastLaunchModal.tsx` | Deleted — Ctrl+K opens wizard at step 3 |
| `TerminalConfigModal.tsx` | Deleted — pane config via pane header |
| OptionsMenu "Use Template" | Calls wizard with template pre-fill |
| OptionsMenu "Import" | Calls wizard with import pre-fill |
| WorktreeDialog | Calls wizard with folder pre-fill |

#### Quick Launch (Ctrl+K)
- Opens wizard at step 3 (tool selection)
- Steps 1-2 pre-filled: name = "Quick Launch", folder = empty, shell = last used or default
- User can click Back to change folder/shell

---

## Phase 2: Pane Header + Placeholder Redesign

### 2.1 Pane header (compact, 32px)

```
[●] opencode │ …\proj │ pwsh │ 2:1  [─] [□] [✕]
```

- **Status dot**: idle (gray), spawning (yellow pulse), running (green), exited (blue), error (red)
- **Title**: clickable to rename (double-click)
- **Cwd + shell badge**: compact, truncated, tooltip full path
- **Pane size indicator**: rows:cols ratio
- **Action buttons** (hover-reveal):
  - `─` toggle controls panel
  - `□` maximize/restore pane
  - `✕` close pane (with ConfirmDialog portal)

### 2.2 Controls panel (collapsible)

```
Shell: [pwsh    ▾]  Folder: [D:\proj     ] [Browse]
Startup: [opencode        ]
                                    [Save] [Reset]
```

- Hidden by default when terminal running
- Auto-open when idle (no session)
- Auto-close when running starts
- "Save" → commit + restart pane with new config
- "Reset" → revert to last saved

### 2.3 States

| State | Header dot | Controls | Body |
|-------|-----------|----------|------|
| Idle | gray | auto-open | "Click ▷ to start" |
| Spawning | yellow pulse | hidden | loading spinner |
| Running | green | hidden (toggle ─) | xterm.js |
| Exited | blue | hidden | "Process exited (N). ↻ Restart?" |
| Error | red | auto-open | error msg + retry |

### 2.4 Maximize pane
- `□` → pane fills entire grid, others hidden
- `❐` or ESC → restore
- `uiStore.maximizedPaneId: string | null`

### 2.5 Remove pane confirm
- `ConfirmDialog` via `createPortal` (not `window.confirm`)

---

## Phase 3: Grid Layout System Redesign

### 3.1 Universal splitters

Every adjacent track pair gets a draggable splitter:
- 1 pane: no splitters
- 2 pane: 1 vertical splitter
- 4 pane: 1 vertical + 1 horizontal
- 6 pane: 2 vertical + 1 horizontal
- 9 pane: 2 vertical + 2 horizontal

**New `GridSplitter`**:
- Props: `axis: 'columns' | 'rows'`, `index: number`, `workspaceId: string`
- Pointer drag → updates `paneSizes[workspaceId]` ratios
- Min pane size: 15%
- Visual: 4px transparent, hover → accent line, cursor `col-resize`/`row-resize`

### 3.2 Layout switcher (post-create)

Toolbar above grid:
```
[1] [2] [4] [6] [9]  ← active highlighted
```

- `setWorkspaceLayout(workspaceId, layoutPreset)`
- Fewer panes → extra panes hidden (not deleted)
- More panes → blank panes created

### 3.3 Maximize integration
- `maximizedPaneId !== null` → grid renders single pane full-size, splitters hidden
- ESC restores

### 3.4 Keyboard navigation
- `Alt+←/→/↑/↓` → focus adjacent pane
- Grid position (row/col index) determines neighbors
- `focusStore.navigatePane(direction)`

### 3.5 Inline pane split
- Hover between panes or at grid edge → `+` button
- Click → splits current pane, new pane inherits shell + cwd
- `addPaneToWorkspace` + layout adjustment

### 3.6 Drag-to-swap panes (lower priority)
- Drag pane header → drop on another → swap positions
- Updates pane order in `workspace.panes`

### 3.7 Store changes

**`uiStore.ts`**:
```ts
maximizedPaneId: string | null;
maximizePane: (paneId: string) => void;
restorePane: () => void;
```

**`workspaceStore.ts`**:
```ts
setWorkspaceLayout: (workspaceId: string, layout: LayoutPreset) => void;
```

**`focusStore.ts`**:
```ts
navigatePane: (direction: 'left' | 'right' | 'up' | 'down') => void;
```

---

## Pain Points Addressed

| # | Pain Point | Fix |
|---|-----------|-----|
| 1 | startupCommand as fake keystroke | Backend `pty_spawn` accepts + injects |
| 2 | CreateWorkspaceModal drops shell | Wizard passes shell to createWorkspace |
| 3 | TerminalConfigModal hardcodes empty startupCommand | Wizard collects command; pane header allows edit |
| 4 | Auto-restart drops startupCommand | Backend restart_session preserves + re-injects |
| 5 | 6 overlapping entry points | Single wizard replaces all |
| 6 | templates_materialize returns metadata only | Templates become wizard presets (pre-fill steps) |
| 7 | workspace_list backend hardcoded | Unchanged — bootstrap stub, snapshot overrides |
| 8 | ShellSpec.args never populated | Out of scope for this phase |

## Files Changed

### Phase 1
- `src-tauri/src/commands/pty.rs` — add startup_command param
- `src-tauri/src/pty/manager.rs` — inject + restart re-inject
- `src-tauri/src/pty/session.rs` — add startup_command field
- `src-tauri/src/pty/mod.rs` — add to PtySessionSnapshot
- `src/types/terminal.ts` — PtySpawnRequest + PtySessionInfo
- `src/stores/workspaceStore.ts` — createWorkspace signature + layout
- `src/stores/uiStore.ts` — wizard state
- `src/components/modals/CreateWorkspaceWizard.tsx` — NEW
- `src/components/modals/CreateWorkspaceModal.tsx` — DELETE
- `src/components/modals/FastLaunchModal.tsx` — DELETE
- `src/components/modals/TerminalConfigModal.tsx` — DELETE
- `src/components/shell/AppShell.tsx` — wire wizard
- `src/components/terminal/XtermTerminal.tsx` — remove frontend inject
- `src/lib/keybindBootstrap.ts` — Ctrl+K opens wizard step 3
- `src/lib/tauri.ts` — ptySpawn accepts startupCommand

### Phase 2
- `src/components/terminal/TerminalPanePlaceholder.tsx` — full rewrite
- `src/styles/app.css` — pane header + controls styles
- `src/stores/uiStore.ts` — maximizedPaneId

### Phase 3
- `src/components/terminal/TerminalGrid.tsx` — full rewrite
- `src/components/terminal/GridSplitter.tsx` — universal rewrite
- `src/components/terminal/LayoutSwitcher.tsx` — NEW
- `src/styles/app.css` — grid + splitter styles
- `src/stores/workspaceStore.ts` — setWorkspaceLayout
- `src/stores/focusStore.ts` — navigatePane
- `src/stores/uiStore.ts` — paneSizes (already exists)
