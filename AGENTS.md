# AGENTS.md — Nonaterm Development Rules

> Rules and conventions for AI agents working on the Nonaterm repository.

## Project Identity

- **Name**: Nonaterm (Terminal Workspace Manager)
- **Platforms**: Windows (primary), macOS, Linux
- **Stack**: Rust + Tauri 2.x (backend), React 19 + TypeScript (frontend), xterm.js (terminal)
- **Target user**: Vibecoders — developers doing AI-assisted coding
- **Repo**: https://github.com/RegenadeJester/nonaterm

---

## Architecture Rules

### Backend (Rust / Tauri)

1. **Offload PTY I/O to dedicated threads** — never block main thread or Tokio runtime with synchronous PTY read/write.
2. **Use Tauri Events for streaming, Commands for request-response** — `pty:output`, `pty:exit` are events; `pty_spawn`, `pty_resize` are commands.
3. **Every Tauri command must return `Result<T, String>`** — never panic, always handle errors gracefully.
4. **Persist state via SQLite** — use `rusqlite` for all persistent data. JSON only for user-editable config.
5. **Autosave must be debounced** — 5-10 second debounce, only save on actual diff.
6. **Keybind passthrough by default** — app must not intercept common CLI shortcuts (Ctrl+P, Ctrl+N, Ctrl+F). App shortcuts use Alt+* or Ctrl+Shift+*.

### Frontend (React + TypeScript)

1. **State management via Zustand** — one store per domain: `workspaceStore`, `terminalStore`, `settingsStore`, `uiStore`, `focusStore`, `aiStore`.
2. **xterm.js with WebGL addon** — required for performance. Always use `FitAddon` and `SearchAddon`.
3. **Cleanup on unmount** — dispose Terminal, detach addons, unsubscribe events, close PTY.
4. **CSS custom properties for theming** — all colors, spacing, fonts via `tokens.css` variables.
5. **One component = one responsibility** — keep components focused and reusable.
6. **TypeScript strict mode** — no `any` types, all props typed with interfaces.

### IPC Contract

- **Command naming**: `pty_*`, `workspace_*`, `config_*`, `system_*`, `keybind_*`
- **Event naming**: `pty:output`, `pty:exit`, `workspace:changed`, `autosave:triggered`
- **Payloads**: Always typed — TypeScript interfaces match Rust structs via serde.

---

## Code Style

### Rust
- Format: `cargo fmt` (default settings)
- Lint: `cargo clippy --all-targets -- -D warnings`
- Naming: `snake_case` functions/variables, `PascalCase` types
- Error handling: `thiserror` for custom, `anyhow` for application-level
- Async: `tokio` runtime, `async`/`await`
- Docs: `///` doc comments on public items

### TypeScript / React
- Format: Prettier (2 spaces, single quotes, trailing comma)
- Lint: ESLint with `@typescript-eslint/recommended`
- Naming: `camelCase` variables/functions, `PascalCase` components/types
- CSS: BEM-ish naming with `__` for elements, `--` for modifiers

---

## Testing Requirements

All PRs must pass:

```bash
# Frontend
npm run typecheck    # No TS errors
npm run lint         # No ESLint warnings
npm run test         # All unit tests pass

# Backend
cargo fmt --check    # Proper formatting
cargo clippy --all-targets -- -D warnings  # No clippy warnings
cargo test           # All Rust tests pass
```

### Test File Placement
- Unit tests: `tests/frontend/*.test.tsx`
- E2E tests: `tests/e2e/*.spec.ts`
- Perf tests: `tests/perf/*.test.tsx`

---

## Common Patterns

### Adding a Tauri Command
1. Define in `src-tauri/src/commands/<domain>.rs`
2. Register in `src-tauri/src/commands/mod.rs`
3. Add IPC wrapper in `src/lib/tauri.ts`
4. Add TypeScript type in `src/types/ipc.ts`

### Adding a Theme
1. Add to `THEMES` in `src/stores/settingsStore.ts`
2. Add CSS variables in `src/styles/tokens.css` (dark + light)
3. Verify WCAG AA contrast (4.5:1 for text, 3:1 for muted)

### Adding a Tool Preset
1. Add to `TOOL_PRESETS` in `src/components/modals/toolPresets.ts`
2. Add to `QUICK_LAUNCH_IDS` in `TerminalLauncher.tsx` for toolbar

---

## Gotchas

- **PTY sessions live in Rust** — frontend only renders, never manages PTY directly
- **Workspace switch uses `display: none`** — keeps terminals alive, prevents unmount
- **Passthrough mode** — forwards ALL keystrokes to terminal, disabling app shortcuts
- **xterm.js WebGL** — falls back to canvas if WebGL unavailable, but performance degrades
- **SQLite migrations** — add new migrations in `src-tauri/src/state/schema.rs`

---

## File Map

```
src/
├── components/
│   ├── terminal/       # TerminalGrid, TerminalPanePlaceholder, XtermTerminal
│   ├── shell/          # AppShell, OptionsMenu, CommandPalette, TerminalLauncher
│   ├── workspace/      # WorkspaceSidebar
│   └── modals/         # FastLaunchModal, TerminalConfigModal, toolPresets
├── stores/             # Zustand stores (workspace, terminal, settings, ui, focus, ai)
├── hooks/              # useKeybind, useFocusTrap, useAppBootstrap
├── lib/                # tauri.ts (IPC), keybind.ts, errorHandler.ts
├── styles/             # tokens.css (variables), app.css (main), modals.css
└── types/              # index.ts, ipc.ts, terminal.ts, workspace.ts

src-tauri/
├── src/
│   ├── pty/            # manager.rs, session.rs, reader.rs, backpressure.rs
│   ├── commands/       # pty.rs, config.rs, keybind.rs, system.rs, window.rs
│   ├── state/          # mod.rs, schema.rs (SQLite)
│   └── keybind/        # store.rs, conflict.rs
└── Cargo.toml
```
