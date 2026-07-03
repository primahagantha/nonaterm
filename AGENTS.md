# AGENTS.md — Nonaterm Development Rules

> Rules dan konvensi untuk AI agents yang bekerja di repository Nonaterm.

## Project Identity
- **Nama**: Nonaterm (Terminal Workspace Manager)
- **Platform**: Windows only (MVP)
- **Stack**: Rust + Tauri 2.x (backend), React + TypeScript (frontend), xterm.js (terminal rendering)
- **Target user**: Vibecoder — developer yang banyak melakukan AI-assisted coding

---

## Architecture Rules

### Backend (Rust / Tauri)
1. **Semua PTY I/O harus di-offload ke dedicated threads** — jangan pernah block main thread atau Tokio runtime dengan synchronous PTY read/write.
2. **Gunakan Tauri Events (bukan Commands) untuk streaming data PTY** — commands untuk request-response, events untuk continuous streaming.
3. **Setiap Tauri command harus punya error handling yang proper** — return `Result<T, String>` atau custom error type, JANGAN panic.
4. **State persistence via SQLite** — gunakan `tauri-plugin-sql` untuk semua persistent data. JSON file hanya untuk config yang user-editable.
5. **Autosave harus debounced + diff-based** — jangan write ke disk setiap perubahan. Debounce 5-10 detik, hanya simpan kalau ada diff.
6. **Keybind passthrough adalah default** — app TIDAK boleh meng-intercept shortcut yang lazim dipakai CLI tools (Ctrl+P, Ctrl+N, Ctrl+F, Ctrl+B, Ctrl+R). App-level shortcuts pakai modifier yang jarang bentrok (Alt+*, Ctrl+Shift+*).

### Frontend (React + TypeScript)
1. **State management via Zustand** — satu store per domain (workspace, terminal, settings, ui).
2. **xterm.js selalu pakai WebGL addon** — wajib untuk performa rendering.
3. **Setiap terminal pane harus cleanup saat unmount** — dispose Terminal instance, detach addons, unsubscribe events.
4. **CSS custom properties untuk theming** — semua warna, spacing, font harus via CSS variables.
5. **Komponen harus reusable dan focused** — satu komponen = satu tanggung jawab.
6. **TypeScript strict mode** — no `any` types, semua props harus typed.

### IPC Contract
1. **Tauri commands prefix by domain**: `pty_*`, `workspace_*`, `config_*`, `system_*`
2. **Event naming**: `pty:output`, `pty:exit`, `workspace:changed`, `autosave:triggered`
3. **Payload selalu typed** — TypeScript interfaces match Rust structs via serde.

---

## Code Style

### Rust
- Format: `rustfmt` (default settings)
- Lint: `clippy` dengan `#![warn(clippy::all)]`
- Naming: `snake_case` untuk functions/variables, `PascalCase` untuk types
- Error handling: `thiserror` untuk custom errors, `anyhow` untuk application-level
- Async: `tokio` runtime, `async`/`await` pattern
- Docs: `///` doc comments on semua public functions dan types

### TypeScript / React
- Format: Prettier (2 spaces, single quotes, trailing comma)
- Lint: ESLint dengan `@typescript-eslint/recommended`
- Naming: `camelCase` untuk variables/functions, `PascalCase` untuk components/types
- Components: functional components only, no class components
- Hooks: custom hooks prefix `use*`
- Imports: absolute paths dari `src/` root

### CSS
- Methodology: CSS Modules atau vanilla CSS dengan BEM-like naming
- Variables: semua design tokens via `--tw-*` custom properties
- No inline styles kecuali dynamic values (grid dimensions)
- Dark mode sebagai default, light mode via `[data-theme="light"]`

---

## Performance Budgets

| Metrik | Target | Hard Limit |
|--------|--------|------------|
| Cold start | < 800ms | < 1200ms |
| Workspace switch | < 100ms | < 200ms |
| Terminal spawn | < 150ms | < 300ms |
| Idle CPU (9 terminals) | < 1% | < 3% |
| Memory per terminal | < 15MB | < 25MB |
| Total memory (9 terminals) | < 200MB | < 300MB |
| UI resize frame rate | ≥ 60fps | ≥ 30fps |

**CI Gate**: Build gagal kalau cold start atau memory footprint regresi > 10% dari baseline.

---

## File Organization

```
src-tauri/src/
├── main.rs          # Entry point — minimal, delegate ke lib
├── lib.rs           # Library root, Tauri builder setup
├── pty/             # PTY management (1 file per concern)
├── workspace/       # Workspace CRUD + layout
├── state/           # Persistence, autosave, recovery
├── config/          # Settings, keybinds
├── commands/        # Tauri IPC command handlers
└── utils/           # Shared utilities

src/
├── components/      # React components (grouped by feature)
├── hooks/           # Custom hooks
├── stores/          # Zustand stores
├── lib/             # Utilities, API wrappers
├── styles/          # CSS files
└── types/           # TypeScript type definitions
```

---

## Git Conventions

- **Branch naming**: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `perf/`
- **Commit messages**: Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`, `refactor:`, `test:`, `chore:`)
- **PR size**: Maksimal 500 LOC per PR. Split kalau lebih besar.
- **Main branch**: `main` — always deployable
- **Dev branch**: `develop` — integration branch

---

## Testing Requirements

### Sebelum merge PR:
1. `cargo test` — semua Rust tests pass
2. `cargo clippy` — no warnings
3. `npm run typecheck` — TypeScript no errors
4. `npm run lint` — ESLint no errors
5. `npm run test` — Vitest tests pass

### Coverage Targets:
- Rust backend: > 70% line coverage
- React components: > 60% (fokus di hooks & stores)
- E2E: cover semua critical user flows (Section 12 PRD)

---

## Security Rules

1. **Tauri permissions minimal** — hanya grant permission yang benar-benar dibutuhkan
2. **No eval, no dynamic script injection** — di frontend
3. **Sanitize semua input** — terutama command yang dikirim ke PTY
4. **Lockfile atomic write** — prevent corruption saat crash
5. **No sensitive data in logs** — jangan log terminal output/content

---

## Documentation Requirements

- Setiap modul Rust harus punya module-level doc comment
- Setiap public function harus punya `///` doc comment
- Setiap React component harus punya JSDoc comment
- README.md harus up-to-date dengan setup instructions
- CHANGELOG.md mengikuti Keep a Changelog format
