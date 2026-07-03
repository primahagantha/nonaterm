# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project aims to follow Semantic Versioning.

## [Unreleased]

### Changed

- **Project rename**: `terwok` → `nonaterm` di seluruh codebase (Rust lib name `nonaterm_lib`, package name, Tauri `productName` + `identifier` `com.nonaterm.app`, GitHub repo URL, file names untuk state/lockfile/log `nonaterm.db` / `nonaterm.lock` / `nonaterm.log`, signing keys `keys/nonaterm(.pub)`, log message brand, panic report banner, error enum, identicon `N`, dan semua file .md). Identifier change `com.terwok.app` → `com.nonaterm.app` akan trigger Windows registry reinstall (tidak kompatibel dengan installer lama).
- **Header redesign**: workspace-header sekarang punya brand mark (icon "N" gradient + nama "Nonaterm" + version pill) di kiri, divider vertikal, info workspace (status dot + theme + h1) di tengah, dan icon-only buttons (⚙ options, ⌘ shortcuts) di kanan. Class baru `.icon-button` (32x32 hit area, 16x16 icon, hover/active/focus states) + variant `.icon-button--primary` (accent) + `.icon-button--ghost`. Hapus text "Options" / "Shortcuts" + kbd hint dari trigger button (kini ada di `title` attr tooltip). RecoveryBanner tetap inline di actions. CSS sebelumnya `.shortcuts-button` dan `.options-menu__trigger` sekarang extend dari `.icon-button`.
- **HTML title**: `Nonaterm` (sebelumnya `Terwok`).
- **Shared `<ConfirmDialog>` + `<PromptDialog>` components** — replaces native `window.confirm` / `window.prompt` dengan in-app styled dialogs. `Esc` to cancel, `Enter` to submit, focus trap (`autoFocus` policy: cancel untuk danger, confirm untuk default), `aria-modal` + `role="alertdialog"`, `aria-labelledby`/`aria-describedby`/`aria-invalid` untuk validation error. 10 tests.
- **Sidebar logo "T" → "N"** — bug fix: brand mark gradient sekarang menampilkan "N" bukan "T" sisa dari brand lama.
- **Esc handlers added** — `OptionsMenu` close on Esc, `RecoveryBanner` dismiss on Esc (aria-label update), `UndoCloseToast` dismiss on Esc, `LogViewer` close on Esc + `aria-expanded`/`aria-controls`/`id` linking. `close-confirm` translated dari Indonesian ke English + Esc handler.
- **`UndoCloseToast` progress bar** — visual `role="progressbar"` dengan `aria-valuenow`/`aria-valuemin`/`aria-valuemax` + `aria-label` untuk screen reader. Button label jadi "Undo (Xs)" explicit seconds.
- **`templates-grid` loading/empty states** — `templates-grid__loading` ("Loading templates…") dan `templates-grid__empty` ("No templates available. Backend may not be ready.") dengan dashed border styling.
- **`WorkspaceSidebar` delete button** — `aria-label="Delete workspace <name>"` + `data-testid="delete-workspace-<id>"` untuk testability + clear screen reader output.

- PTY core with spawn, write, resize, close, restart, and backpressure flow control
- xterm.js integration with WebGL rendering and terminal lifecycle cleanup
- Diagnostics logging, crash reports, and log viewer panel
- Recovery banner with restore/fresh-start choice after dirty shutdown
- SQLite-backed state persistence with JSON fallback snapshot
- Workspace CRUD: create, rename, delete, reorder
- Manual grid splitter for supported layouts
- Config export/import commands and toolbar
- Auto-update check/install hooks via GitHub releases
- Perf smoke harness, stress harness scaffolding, and E2E scaffolding
- 6-theme registry (Midnight, Aurora, Solarized, Nord, Dracula, Monokai) with light/dark mode + font + size customization
- Sidebar collapse rail + pane count badges + auto-revealed action buttons
- Options menu (Ctrl+,) with Appearance / Config / Keybinds / Templates tabs
- Shortcuts modal (Ctrl+.) with search + filter
- Keybind registry + 3-layer scope (app / terminal / passthrough) + customization UI
- Workspace templates: 5 built-in + `templates_list` / `templates_materialize` commands
- Shell resolver with well-known install dirs, PATH lookup, and ShellSpec IPC contract
- `system_run_multi_spawn_probe` for 9-pane cold-start measurement
- Crash simulation: `ProcessExitsImmediately` / `BrokenPipeOnRead` / `SpawnEagain` / `PanicDuringOutput` / `ResizeInvalid` with `CrashInjector` + atomic counters
- Release signing keypair (MVP), `scripts/sign-release.ps1`, and `RELEASE_SIGNING.md` rotation guide
- **Native perf harness** (`IdleReport` + `ThroughputReport` + `MetricDelta`/`BaselineComparison` regression gate with 10% default threshold, LowerIsBetter/HigherIsBetter direction aware)
- **`system_run_idle_probe`** (RSS sampling over dwell window) and **`system_run_throughput_probe`** (synthetic `for /L` load via `CountingPtyEventSink`) commands
- Standalone probe binary `src-tauri/examples/perf_probe.rs` (no Tauri runtime needed)
- CI gate scripts: `scripts/perf-check.mjs`, `scripts/perf-write-baseline.mjs`, `scripts/perf-baseline-lib.mjs`
- `perf-baseline.json` placeholder + npm scripts `perf:check` / `perf:build-probe` / `perf:write-baseline`
- **Keybind passthrough backend (TDD 3.6)** — SQLite-backed `keybind_overrides` + `pane_passthrough` tables (migration v2), 7 Tauri commands (`keybind_get_overrides` / `set_override` / `clear_override` / `clear_all_overrides` / `check_conflict` + `pane_get_passthrough_list` / `pane_set_passthrough`), `NormalizedCombo` + 19-entry conflict database untuk readline/vim/terminal flow control
- **FE keybind backend sync** — `settingsStore` extended dengan `hydrateFromBackend` (called by `useAppBootstrap` after ready) + fire-and-forget backend sync di setter-setter keybind/passthrough. Backend wins over localStorage untuk cross-device sync.
- **Extended crash sim (state-level)** — 3 skenario baru: `SnapshotWriteIoError` (simulated I/O error saat write JSON snapshot), `SqliteBusyTimeout` (validasi `PRAGMA busy_timeout=5000` honored), `RecoveryRace` (lockfile + snapshot update overlap). `StateFaultInjector` opt-in untuk `StateManager`. 5 counter baru di `CrashCounters` + `CrashSummary` + matching di `system_run_crash_simulation` Tauri command.
- **Real crash sim integration** — `system_run_crash_simulation` sekarang trigger real fault via live `StateManager` (install fault → run op → verify counter). `StateManager::install_fault_injector()` + `clear_fault_injector()` untuk runtime control.
- **TTY-responding sink** — `TtyRespondingSink` di `perf.rs` scan `ESC[6n` / `ESC[0c` / `ESC[c` di output; track `cursor_query_received` + `device_attributes_received` + `unhandled_queries` counters. Command baru `system_run_tty_responding_probe`. Detects degraded pipeline (cmd.exe waiting for query reply).
- **Keybind localStorage → SQLite backfill** — `settingsStore.migrateKeybindsFromLocalStorage()` push v1 overrides ke SQLite on first boot kalau SQLite empty. Called dari `useAppBootstrap` setelah `hydrateFromBackend` (kalau return false).
- **Workspace template export/import** — `templates_export(workspace_id, name, path)` serialize current workspace → JSON file (atomic). `templates_import(path)` parse + validate. Modul `templates_io.rs` baru. FE: 2 buttons di OptionsMenu Templates tab.
- **Multi-window support (V1)** — `WindowRegistry` di `AppState`. 3 commands baru: `workspace_open_in_new_window` (URL hash routing via `initialization_script`), `workspace_list_windows`, `workspace_close_window`. `CloseRequested` handler auto-cleanup registry. Emit `workspace:window-opened` / `workspace:window-closed` events. FE: Detach button (⧉) di sidebar + `openWindows` di uiStore.
- **Bundling + assets** — `.gitignore` extended dengan 10 build-artifact entries. `scripts/check-size.mjs` print total bundle size + perf baseline snapshot. `npm run size:check`. README section "Build Size" baru.

### Changed

- Startup commands now auto-run after pane spawn/restart
- Default sample workspaces now use generic/portable paths
- Default theme is now **light** (not dark); theme mode + theme id separated for cross-mode reuse
- Keybind overrides persist in `localStorage` via `settingsStore.keybindOverrides`
- Snapshot hydration prioritises `recovery.snapshot` (clean + dirty) over summary so pane titles show at first paint
- Workspace templates register with `default_open` mode = first pane always opened + 1 extra if panes ≤2

### Fixed

- PTY exit watcher race during restart
- Dirty shutdown handling no longer silently overwrites recovery choice
- Browse folder not opening: `tauri-plugin-dialog` was missing from `Cargo.toml` and not registered in builder; now wired with `dialog:default` permission
- Sidebar rename input had no `min-width: 0`, offside when long; now uses ellipsis + auto-focus + select
- Browser default `cmd /C exit 137` exit code was being misread on Windows; now validated end-to-end
