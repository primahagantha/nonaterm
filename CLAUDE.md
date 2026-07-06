# CLAUDE.md — Nonaterm Project Context

## Project Overview

**Nonaterm** is a cross-platform terminal workspace manager for AI coding agents. Built with Rust/Tauri 2.x backend and React/TypeScript/xterm.js frontend.

- **Repo**: https://github.com/RegenadeJester/nonaterm
- **Platform**: Windows (primary), macOS, Linux
- **Stack**: Rust + Tauri 2.x, React 19, TypeScript, Zustand, xterm.js, Vite

## Quick Commands

```bash
npm run dev              # Frontend dev mode
npm run tauri dev        # Full Tauri dev mode
npm run test             # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
npm run typecheck        # TypeScript check
npm run lint             # ESLint
./build.sh               # Full quality gate
```

## Architecture

### Frontend (`src/`)
- **Components**: `terminal/` (grid, panes, xterm), `shell/` (app shell, modals), `workspace/` (sidebar)
- **State**: Zustand stores in `stores/` — one per domain (workspace, terminal, settings, ui, focus, ai)
- **Styles**: CSS custom properties in `styles/tokens.css`, main styles in `app.css`
- **IPC**: `lib/tauri.ts` wraps all Tauri commands

### Backend (`src-tauri/`)
- **PTY**: `pty/` — session manager, reader, backpressure, shell resolver
- **Commands**: `commands/` — Tauri command handlers (pty, config, keybind, system, window)
- **State**: `state/` — SQLite persistence with migrations
- **Keybind**: `keybind/` — keybind store, conflict detection

### Key Conventions
- **IPC naming**: `pty_*`, `workspace_*`, `config_*`, `system_*` for commands
- **Event naming**: `pty:output`, `pty:exit`, `workspace:changed`
- **Theming**: All colors via CSS custom properties
- **Error handling**: Rust uses `Result<T, String>`, TypeScript uses typed errors

### Testing
- **Unit**: Vitest in `tests/frontend/`
- **E2E**: Playwright in `tests/e2e/`
- **Perf**: Custom perf probe in `tests/perf/`

## Common Tasks

### Adding a new Tauri command
1. Add command in `src-tauri/src/commands/`
2. Register in `src-tauri/src/commands/mod.rs`
3. Add IPC wrapper in `src/lib/tauri.ts`
4. Add TypeScript type in `src/types/ipc.ts`

### Adding a new theme
1. Add theme definition in `src/stores/settingsStore.ts`
2. Add CSS variables in `src/styles/tokens.css`
3. Update `docs/theme-docs.md`

### Adding a new tool preset
1. Add to `TOOL_PRESETS` in `src/components/modals/toolPresets.ts`
2. Add to `QUICK_LAUNCH_IDS` in `TerminalLauncher.tsx` if it should appear in toolbar

## Gotchas

- PTY sessions are managed by Rust backend — frontend only renders
- Workspace switch uses `display: none` to keep terminals alive
- Passthrough mode forwards all keystrokes to the terminal program
- xterm.js uses WebGL renderer for performance

## Current Work: Settings UI Rework (branch: `rework/settings-ui`)

**PR**: https://github.com/RegenadeJester/nonaterm/pull/19

### Completed (✅)

| Step | Feature | Files |
|------|---------|-------|
| 1 | **Fullpage settings** (not modal overlay) | `AppShell.tsx`, `SettingsPage.tsx`, `OptionsMenu.tsx` |
| 2 | **Card-based layout** (2-col grid, responsive) | `app.css` |
| 3 | **12 sections**: Appearance, Terminal, Quick Launch, AI, SSH, Broadcast, Keybinds, Templates, Snippets, Config, Git, About | `SettingsPage.tsx` |
| 4 | **SSH connection manager** | `SettingsPage.tsx`, `settingsStore.ts` |
| 5 | **Quick Launch presets** | `SettingsPage.tsx`, `settingsStore.ts` |
| 6 | **AI redesign** (provider cards, params, quick add) | `AISettingsPanel.tsx` |
| 7 | **New terminal settings** (cursor, ligatures, line height, padding, GPU) | `settingsStore.ts` |
| 8 | **LogViewer enhanced** (search, export, counts) | `LogViewer.tsx` |
| 9 | **CI/CD fixes** | `.github/workflows/` |
| 10 | **Tests pass** (67 E2E, 266 unit) | test files |
| 11 | **Installer fixes** (cross-distro) | `install.sh`, `README.md` |

### New settingsStore fields

`terminalCursorStyle`, `terminalCursorBlink`, `terminalFontLigatures`, `terminalLineHeight`, `terminalPadding`, `notificationSound`, `notificationDesktop`, `terminalGpuAcceleration`, `terminalMaxRenderRate`, `sshConnections[]` + CRUD actions

### Next Steps (TODO)

| Step | What | Priority |
|------|------|----------|
| 3 | Broadcast redesign (pane selector, history, macros) | Medium |
| 4 | Template Marketplace (GitHub integration) | Medium |
| 5 | Git redesign (worktree, branch, stash, history) | Medium |
| 6 | Config redesign (JSON editor, diff, validation) | Medium |
| 7 | WCAG accessibility audit | High |
| 8 | E2E tests for all new settings | High |

### Architecture Notes

- `OptionsMenu.tsx` = trigger button only (15 lines) — UI lives in `SettingsPage.tsx`
- Settings renders inside `app-main` when `optionsOpen=true`
- Header/diagnostics hidden when settings open
- Nav items have `role="tab"` + `aria-selected`
- Plan: `docs/plans/settings-rework.md`
