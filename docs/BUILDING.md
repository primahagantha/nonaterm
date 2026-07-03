# Building Nonaterm

## Prerequisites

- **Node.js** 20+ and npm
- **Rust** (latest stable) — [rustup.rs](https://rustup.rs/)
- **Windows**: WebView2 (comes with Windows 11)
- **macOS**: Xcode Command Line Tools
- **Linux**: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`

## Quick Start

```bash
# Clone
git clone https://github.com/RegenadeJester/nonaterm.git
cd nonaterm

# Install dependencies
npm install

# Dev mode (frontend + backend hot reload)
npm run dev
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev mode with hot reload |
| `npm run build` | TypeScript check + Vite build |
| `npm run tauri dev` | Full Tauri dev mode |
| `npm run tauri build` | Production build (MSI/EXE/DMG/AppImage) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run test:perf` | Performance tests |

## Build Scripts

```bash
# Windows
build.bat

# Linux/macOS
./build.sh
```

Runs: typecheck → lint → unit tests → vite build. Stops on first failure.

## Production Build (Tauri)

```bash
npm run tauri build
```

Output:
- **Windows**: `src-tauri/target/release/bundle/msi/*.msi`, `nsis/*.exe`
- **macOS**: `src-tauri/target/release/bundle/dmg/*.dmg`
- **Linux**: `src-tauri/target/release/bundle/deb/*.deb`, `appimage/*.AppImage`

## Troubleshooting

### "cargo build failed"
Make sure Rust is installed: `rustup update stable`

### "WebView2 not found" (Windows)
Install [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### "libwebkit2gtk not found" (Linux)
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```
