<div align="center">

# ⚡ Nonaterm

**Terminal Workspace Manager for AI Coding Agents**

[![CI](https://github.com/RegenadeJester/nonaterm/actions/workflows/ci.yml/badge.svg)](https://github.com/RegenadeJester/nonaterm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/RegenadeJester/nonaterm)](https://github.com/RegenadeJester/nonaterm/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

Manage multi-terminal dev work as named workspaces — built for vibecoders running AI coding agents.

[Features](#features) · [Install](#install) · [Screenshots](#screenshots) · [Development](#development) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why Nonaterm

Scattered terminal windows are dead. Nonaterm gives you **named workspaces** with up to **9 terminal panes** each — perfect for running Claude Code, OpenCode, Codex, Aider, and other AI agents side-by-side.

- 🖥️ **Native desktop** — Rust + Tauri (not Electron)
- 🏗️ **Workspace-first** — organize by project, not by window
- ⚡ **Quick launch** — one-click to spawn any AI coding agent
- 🎨 **14 themes** — dark + light, all WCAG AA accessible
- 🔄 **Crash recovery** — auto-restart, session persistence
- ⌨️ **Passthrough mode** — TUI apps (vim, tmux, lazygit) work perfectly

## Features

### Terminal Grid
- Multi-pane layouts: `1 / 2 / 4 / 6 / 9` panes
- Draggable grid splitters for custom sizing
- Per-pane shell selector (PowerShell, CMD, WSL, Git Bash, Zsh, Fish)
- Startup commands auto-run per pane
- Terminal search (`Ctrl+F`)

### Workspaces
- Create, rename, delete, reorder workspaces
- Per-workspace accent color and font
- Quick switch via sidebar or `Alt+1..9`
- Workspace templates for common setups
- Detach workspace to new window

### AI Agent Integration
- Quick launch toolbar: OpenCode, Claude Code, Codex, and more
- Custom tool presets
- Smart passthrough detection for TUI apps
- Token meter and broadcast panel

### Themes & Accessibility
- 14 built-in themes (Midnight, Aurora, Solarized, Nord, Dracula, Monokai, Tokyo Night, Rose Pine, Catppuccin, Gruvbox, One Dark, Synthwave, Everforest, Kanagawa)
- Light and dark mode per theme
- WCAG AA contrast ratios verified
- Custom CSS overrides
- `prefers-reduced-motion` support

### Reliability
- Crash recovery with session restore
- Auto-restart on non-zero exit
- Auto-save every 5 seconds
- Undo close workspace (6-second toast)

## Screenshots

> 📸 Screenshots coming soon! Run `npm run tauri dev` to see Nonaterm in action.

<!-- 
![Workspace View](docs/screenshots/workspace.png)
![Quick Launch](docs/screenshots/quick-launch.png)
![Theme Gallery](docs/screenshots/themes.png)
![Multi-Pane Grid](docs/screenshots/multi-pane.png)
-->

## Install

### Windows

```powershell
irm https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.ps1 | iex
```

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
```

### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
```

Auto-detects distro (Debian, Fedora, Arch, Kali, openSUSE, etc.), installs system dependencies, and picks the best package format.

> **Manual install / force format / dev build** → see [docs/manual.md](docs/manual.md)

## Shell Support

| Platform | Default | Available |
|----------|---------|-----------|
| Windows | PowerShell | PowerShell, PS7, CMD, Git Bash, WSL |
| macOS | Zsh | Zsh, Bash, Fish |
| Linux | Bash | Bash, Zsh, Fish, Dash |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Quick launch tool |
| `Ctrl+N` | New workspace |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+.` | Keyboard shortcuts |
| `Ctrl+,` | Options |
| `Ctrl+F` | Search terminal |
| `Alt+1..9` | Switch workspace |
| `Ctrl+Shift+Esc` | Toggle passthrough |

## Development

### Prerequisites

- **Node.js** 20+
- **Rust** (latest stable) — [rustup.rs](https://rustup.rs/)
- Platform-specific deps → see [docs/manual.md](docs/manual.md#prerequisites)

### Quick Start

```bash
git clone https://github.com/RegenadeJester/nonaterm.git
cd nonaterm
npm install
npm run tauri dev
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend dev mode |
| `npm run tauri dev` | Full Tauri dev mode |
| `npm run tauri build` | Production build |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

### Quality Gate

```bash
# Windows
build.bat

# Linux/macOS
./build.sh
```

## Architecture

```
nonaterm/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── terminal/       # Terminal grid, panes, xterm
│   │   ├── shell/          # App shell, sidebar, modals
│   │   ├── workspace/      # Workspace management
│   │   └── vault/          # SSH vault
│   ├── stores/             # Zustand state management
│   ├── hooks/              # React hooks
│   ├── lib/                # Utilities and IPC
│   ├── styles/             # CSS with custom properties
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── pty/            # PTY session management
│   │   ├── commands/       # Tauri command handlers
│   │   ├── state/          # SQLite persistence
│   │   └── keybind/        # Keybind management
│   └── Cargo.toml
├── tests/                  # Test suites
│   ├── frontend/           # Vitest unit tests
│   ├── e2e/                # Playwright E2E tests
│   ├── perf/               # Performance tests
│   └── stress/             # Stress tests
└── docs/                   # Documentation
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for vibecoders**

[Report Bug](https://github.com/RegenadeJester/nonaterm/issues/new?template=bug_report.md) · [Request Feature](https://github.com/RegenadeJester/nonaterm/issues/new?template=feature_request.md) · [Documentation](docs/)

</div>
