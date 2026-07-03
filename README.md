# Nonaterm

Terminal Workspace Manager for vibecoders.

Nonaterm is a cross-platform desktop app built with Rust, Tauri 2.x, React, and xterm.js to manage multi-terminal development work as named workspaces instead of scattered shell windows.

## Quick Install

### Windows
```powershell
# PowerShell (recommended)
irm https://raw.githubusercontent.com/regenadejester/nonaterm/main/install.ps1 | iex

# Or download MSI/EXE from GitHub Releases
```

### macOS
```bash
curl -fsSL https://raw.githubusercontent.com/regenadejester/nonaterm/main/install.sh | bash
```

### Linux
```bash
curl -fsSL https://raw.githubusercontent.com/regenadejester/nonaterm/main/install.sh | bash
```

### Manual Download
Download from [GitHub Releases](https://github.com/regenadejester/nonaterm/releases):
- **Windows**: `.msi` or `.exe` installer
- **macOS**: `.dmg` (Intel & Apple Silicon)
- **Linux**: `.deb`, `.rpm`, or `.AppImage`

## Why Nonaterm

- Workspace-first UX for AI-assisted coding workflows
- Up to 9 terminal panes per workspace
- Native desktop footprint with Rust + Tauri (not Electron)
- Cross-platform: Windows, macOS, Linux
- Crash recovery, autosave, restart controls built in

## Key Features

- Multi-pane terminal grid with presets `1 / 2 / 4 / 6 / 9`
- Workspace CRUD: create, rename, delete, reorder
- Per-workspace visual identity with accent color + font
- PTY lifecycle: spawn, write, resize, close, restart
- Startup command auto-run per pane
- Crash recovery via lockfile + autosave snapshot
- Command palette (`Ctrl+Shift+P`)
- Keybind passthrough (terminal shortcuts not intercepted)
- 14 built-in themes (dark + light)
- WCAG AA accessible color contrast
- Config export/import JSON
- Auto-update via GitHub releases

## Shell Support

| Platform | Default | Available |
|----------|---------|-----------|
| Windows | PowerShell | PowerShell, PS7, CMD, Git Bash, WSL |
| macOS | Zsh | Zsh, Bash, Fish |
| Linux | Bash | Bash, Zsh, Fish, Dash |

## Development

### Prerequisites
- Node.js 20+
- Rust 1.82+
- Platform-specific build tools:
  - **Windows**: WebView2 runtime (built into Windows 11)
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Setup
```bash
npm install
npm run tauri dev
```

### Frontend Only (browser mode)
```bash
npm run dev
```

## Build

```bash
npm run tauri build
```

## Quality Gates

```bash
npm run test           # Unit tests (162+)
npm run test:e2e       # E2E tests (23+)
npx eslint src/        # Lint
npx tsc -b --noEmit    # Type check
cargo test             # Rust tests (120+)
```

## CI/CD

GitHub Actions builds for all platforms on every push:
- **Windows**: MSI + EXE installers
- **macOS**: DMG (Intel x64 + Apple Silicon aarch64)
- **Linux**: DEB + RPM + AppImage

Releases are created automatically on tag push (`v*`).

## Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Cold start | <800ms | ✅ |
| Switch workspace | <100ms | ✅ |
| Spawn terminal | <150ms | 108ms |
| Idle 9-pane memory | <200MB | ~6.9MB |
| Grid resize | ≥60fps | ✅ |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React 19 + TypeScript + Zustand + xterm.js     │
├─────────────────────────────────────────────────┤
│                 Tauri IPC Bridge                 │
├─────────────────────────────────────────────────┤
│                   Backend                        │
│  Rust + portable-pty + SQLite + tokio            │
├─────────────────────────────────────────────────┤
│                 OS Platform                      │
│  Windows (ConPTY) / macOS (PTY) / Linux (PTY)   │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
src/                    # Frontend (React + TypeScript)
  components/           # UI components
  stores/               # Zustand state management
  hooks/                # React hooks
  lib/                  # Utilities + Tauri IPC
  styles/               # CSS tokens + component styles
src-tauri/              # Backend (Rust)
  src/commands/         # Tauri IPC commands
  src/pty/              # PTY management
  src/state/            # SQLite state
tests/                  # Test suites
  frontend/             # Unit tests
  e2e/                  # Playwright E2E
  perf/                 # Performance tests
```

## Roadmap

- [x] MVP: Workspace + grid terminal + PTY + persistence
- [x] V1: Multi-window, templates, keybind passthrough, search
- [x] Cross-platform: Windows + macOS + Linux
- [x] CI/CD: GitHub Actions for all platforms
- [ ] V2: Attention Inbox, Broadcast Input, Token Meter
- [ ] V2: Blocks-based output, Inline rendering
- [ ] Plugin system

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT. See [`LICENSE`](./LICENSE).

## Acknowledgments

- [Tauri](https://tauri.app)
- [xterm.js](https://xtermjs.org)
- [portable-pty](https://github.com/nicoulaj/portable-pty)
