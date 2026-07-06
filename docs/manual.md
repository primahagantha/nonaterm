# Manual Installation

If the auto-installer doesn't work for your setup, use these manual methods.

---

## Windows

### Auto-install (PowerShell)

```powershell
irm https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.ps1 | iex
```

### Manual download

Download from [GitHub Releases](https://github.com/RegenadeJester/nonaterm/releases/latest):

- `.msi` — system-wide installer (recommended)
- `.exe` — user-level installer

---

## macOS

### Auto-install

```bash
curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
```

Auto-installs Xcode CLI tools if missing. Works on Intel and Apple Silicon.

### Manual download

Download `.dmg` from [GitHub Releases](https://github.com/RegenadeJester/nonaterm/releases/latest), open it, drag `Nonaterm.app` to `/Applications`.

---

## Linux

### Auto-install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
```

The installer auto-detects your distro family, installs system dependencies (WebKit2GTK, GTK3, libappindicator, librsvg), and picks the best package format.

### Force a specific format

```bash
# .deb (Debian / Ubuntu / Kali / Mint / Pop / Elementary)
curl -fsSL .../install.sh | bash -s -- --deb

# .rpm (Fedora / RHEL / Rocky / Alma / CentOS)
curl -fsSL .../install.sh | bash -s -- --rpm

# AppImage (Arch / Manjaro / any distro, no root needed)
curl -fsSL .../install.sh | bash -s -- --appimage

# .rpm (openSUSE / SLES)
curl -fsSL .../install.sh | bash -s -- --rpm
```

### Non-interactive mode (CI / scripting)

```bash
curl -fsSL .../install.sh | bash -s -- --yes
```

### Distro reference

| Family | Distros | Default Format | Package Manager |
|--------|---------|---------------|-----------------|
| Debian | Ubuntu, Kali, Mint, Pop, Elementary, Parrot, Raspbian | `.deb` | `dpkg` |
| Fedora | Fedora, RHEL, Rocky, Alma, CentOS, Nobara | `.rpm` | `dnf` |
| Arch | Arch, Manjaro, EndeavourOS, Garuda, CachyOS | AppImage | `~/.local/bin` |
| SUSE | openSUSE, SLES | `.rpm` | `zypper` |
| Other | Alpine, Void, etc. | AppImage | `~/.local/bin` |

### Manual download

Download from [GitHub Releases](https://github.com/RegenadeJester/nonaterm/releases/latest):

- `.deb` — Debian/Ubuntu/Kali/Mint
- `.rpm` — Fedora/RHEL/openSUSE
- `.AppImage` — universal, works on any distro

---

## Development (from source)

### Prerequisites

- **Node.js** 20+
- **Rust** (latest stable) — [rustup.rs](https://rustup.rs/)
- **Windows**: WebView2 (built into Windows 11)
- **macOS**: `xcode-select --install`
- **Linux**:

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

### Build

```bash
git clone https://github.com/RegenadeJester/nonaterm.git
cd nonaterm
npm install
npm run tauri dev
```

### Build commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend dev mode |
| `npm run tauri dev` | Full Tauri dev mode |
| `npm run tauri build` | Production build |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
