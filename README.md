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
# PowerShell (recommended)
irm https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.ps1 | iex
```

Or download directly from [GitHub Releases](https://github.com/RegenadeJester/nonaterm/releases/latest) — MSI or EXE installer available.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
```

Downloads DMG and installs to `/Applications`. Works on both Intel and Apple Silicon.

### Linux

**Auto-detect (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
```

The installer auto-detects your distro and picks the best package format.

**Or force a specific format:**

```bash
# Debian / Ubuntu / Kali / Mint / Pop
curl -fsSL .../install.sh | bash -s -- --deb

# Fedora / RHEL / Rocky / Alma
curl -fsSL .../install.sh | bash -s -- --rpm

# Arch / Manjaro / EndeavourOS
curl -fsSL .../install.sh | bash -s -- --appimage

# openSUSE
curl -fsSL .../install.sh | bash -s -- --rpm

# Any distro (universal, no root)
curl -fsSL .../install.sh | bash -s -- --appimage
```

**Non-interactive (CI / scripting):**

```bash
curl -fsSL .../install.sh | bash -s -- --yes
```

| Distro Family | Default Format | Package Manager |
|---------------|---------------|-----------------|
| Debian / Ubuntu / Kali / Mint | `.deb` | `dpkg` |
| Fedora / RHEL / Rocky / Alma | `.rpm` | `dnf` |
| Arch / Manjaro / EndeavourOS | AppImage | `~/.local/bin` |
| openSUSE | `.rpm` | `zypper` |
| Other | AppImage | `~/.local/bin` |

Or download `.deb` / `.rpm` / `.AppImage` directly from [Releases](https://github.com/RegenadeJester/nonaterm/releases/latest).

### Manual Download

Download from [GitHub Releases](https://github.com/RegenadeJester/nonaterm/releases):
- **Windows**: `.msi` or `.exe` installer
- **macOS**: `.dmg` (Intel & Apple Silicon)
- **Linux**: `.deb`, `.rpm`, or `.AppImage`

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
- **Windows**: WebView2 (built into Windows 11)
- **macOS**: `xcode-select --install`
- **Linux**: Install WebView2/GTK dev libs for your distro:
  ```bash
  # Debian / Ubuntu / Kali
  sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf

  # Fedora / RHEL / Rocky
  sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel patchelf

  # Arch / Manjaro
  sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg patchelf

  # openSUSE
  sudo zypper install webkit2gtk-4_1-devel gtk3-devel libappindicator3-devel rsvg2-devel patchelf
  ```

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
