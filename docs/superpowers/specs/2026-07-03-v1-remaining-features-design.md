# Design Spec: V1 Remaining Features (10 fitur)

**Date**: 2026-07-03
**Status**: Approved
**Features**: 10 (Broadcast, Token Meter, Diff Strip, Onboarding, Paste Confirmation, Auto-Restart, Snippet, Worktree Binding, Resize Grid, Git Integration)

---

## Category A: Backend Sudah Ada, Wire Frontend (4 fitur)

### A1. Broadcast Input Integrasi
- **Approach**: Sidebar panel dengan daftar terminal aktif + input field
- **Backend**: Sudah ada (`ptyWrite`)
- **Frontend**: `BroadcastPanel.tsx` sudah ada, perlu integrasi ke sidebar
- **Files**: `src/components/shell/BroadcastPanel.tsx`, `src/components/workspace/WorkspaceSidebar.tsx`
- **Acceptance**: Panel muncul di sidebar, user bisa select terminal, input broadcast, send ke multiple terminal

### A2. Token/Cost Meter Integrasi
- **Approach**: Parse output AI agent CLI (Claude Code, Cursor, opencode, cline, agy)
- **Backend**: Perlu parser untuk berbagai format token output
- **Frontend**: `TokenMeter.tsx` sudah ada, perlu real parsing
- **Files**: `src/lib/tokenParser.ts`, `src/components/shell/TokenMeter.tsx`
- **Acceptance**: Parse token dari berbagai AI agent, tampilkan counter di header workspace

### A3. Agent Edit Diff Strip
- **Approach**: File watcher di working directory, detect perubahan file
- **Backend**: Perlu `notify` crate atau `tauri-plugin-fs-watch`
- **Frontend**: `DiffStrip.tsx` sudah ada, perlu file watcher integration
- **Files**: `src-tauri/src/fs_watcher.rs`, `src/components/shell/DiffStrip.tsx`
- **Acceptance**: File watcher detect perubahan, tampilkan strip diff mini di samping pane

### A4. Smart-Default Onboarding Passthrough
- **Status**: **SUDAH TERIMPLEMENTASI** (lines 72-93 di TerminalPanePlaceholder)
- **Evidence**: Banner suggestion muncul saat detect vim/nvim/tmux/opencode
- **Action**: Skip, sudah selesai

---

## Category B: Butuh Backend + Frontend Baru (4 fitur)

### B1. Multiline Paste Confirmation
- **Approach**: Dialog konfirmasi saat paste mengandung newline
- **Backend**: Tidak perlu
- **Frontend**: Intercept paste event di `XtermTerminal.tsx`
- **Files**: `src/components/terminal/XtermTerminal.tsx`, `src/components/shell/Dialogs.tsx`
- **Acceptance**: Paste dengan newline shows dialog, single-line pass through, toggle di settings

### B2. Auto-Restart Configurable Policy
- **Approach**: Settings UI untuk max_retries, backoff_ms, loop guard
- **Backend**: Sudah ada (`autoRestart` di settingsStore)
- **Frontend**: Perlu UI di Settings > Terminal
- **Files**: `src/stores/settingsStore.ts`, `src/components/shell/OptionsMenu.tsx`
- **Acceptance**: User bisa set max_retries, backoff_ms, loop guard prevents infinite restart

### B3. Snippet Library
- **Approach**: Sidebar panel dengan daftar snippet
- **Backend**: Sudah ada (`snippets` di settingsStore)
- **Frontend**: Perlu UI panel di sidebar
- **Files**: `src/components/shell/SnippetPanel.tsx`, `src/components/workspace/WorkspaceSidebar.tsx`
- **Acceptance**: Panel muncul di sidebar, user bisa add/edit/delete snippet, klik untuk copy/inject

### B4. Workspace-to-Worktree Auto-Binding
- **Approach**: Opsi 'Bind ke Git Worktree' saat bikin workspace baru
- **Backend**: Sudah ada (`git_create_worktree`)
- **Frontend**: Perlu UI di `CreateWorkspaceModal`
- **Files**: `src/components/modals/CreateWorkspaceModal.tsx`
- **Acceptance**: Checkbox di create workspace modal, auto-create worktree + branch

---

## Category C: Butuh Refactor Besar (2 fitur)

### C1. Resize Grid Manual (Full Drag)
- **Approach**: Drag divider antar pane untuk resize bebas
- **Backend**: Perlu update grid layout logic
- **Frontend**: Refactor `GridSplitter.tsx` untuk support free drag
- **Files**: `src/components/terminal/GridSplitter.tsx`, `src/components/terminal/TerminalGrid.tsx`
- **Acceptance**: User bisa drag divider, pane resize real-time, layout persist

### C2. Git Integration Full Lifecycle
- **Approach**: Full git worktree lifecycle (create, list, delete, bind)
- **Backend**: Sudah ada (`git.rs`)
- **Frontend**: Perlu UI untuk manage worktrees
- **Files**: `src/components/shell/WorktreePanel.tsx`, `src-tauri/src/commands/git.rs`
- **Acceptance**: User bisa list worktrees, create new, delete, bind ke workspace

---

## Implementation Order

1. A1: Broadcast Input Integrasi
2. A2: Token/Cost Meter Integrasi
3. A3: Agent Edit Diff Strip
4. B1: Multiline Paste Confirmation
5. B2: Auto-Restart Configurable Policy
6. B3: Snippet Library
7. B4: Workspace-to-Worktree Auto-Binding
8. C1: Resize Grid Manual
9. C2: Git Integration Full Lifecycle

(A4: Skip — sudah terimplementasi)

## Testing Strategy

Setiap fitur mengikuti loop engineering pattern:
1. Write unit tests first (TDD)
2. Implement feature
3. Run unit tests → fix until pass
4. Write E2E tests
5. Run E2E tests → fix until pass
6. Code review
7. Fix review findings
8. Quality gate: typecheck + lint + test clean
9. Move to next feature
