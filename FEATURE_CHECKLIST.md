# Nonaterm Feature Checklist

> Manual testing checklist. Kolom **Status** diisi setelah testing: ✅ = works, ❌ = broken, ⚠️ = partial/ugly

## Core Workspace

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 1 | Buka app, langsung ada 1 workspace + 1 terminal | Auto | | |
| 2 | Create workspace baru (klik + di sidebar) | Ctrl+N | | |
| 3 | Workspace langsung dibuat + auto inline rename | - | | |
| 4 | Rename workspace (klik ✎) | - | | |
| 5 | Switch workspace (klik di sidebar) | Alt+1..9 | | |
| 6 | Close workspace (klik ⊗) - idle = langsung close | - | | |
| 7 | Close workspace - ada proses = 3 opsi dialog | - | | |
| 8 | Undo close workspace (toast muncul 6 detik) | - | | |
| 9 | Delete workspace permanent (klik ✕) | - | | |
| 10 | Detach workspace ke window baru (klik ⧉) | - | | |
| 11 | Search workspace di sidebar | - | | |
| 12 | Sidebar collapse/expand | - | | |
| 13 | Sidebar collapsed: angka 1-9 switch workspace | Alt+1..9 | | |
| 14 | Accent color per workspace (warna di sidebar) | - | | |
| 15 | Font per-workspace override | - | | |

## Terminal Grid

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 16 | 1-pane layout (Single) | - | | |
| 17 | 2-pane layout (Split) | - | | |
| 18 | 4-pane layout (Grid 2x2) | - | | |
| 19 | 6-pane layout (Grid 3x2) | - | | |
| 20 | 9-pane layout (Grid 3x3) | - | | |
| 21 | Grid splitter resize (drag antar pane) | - | | |
| 22 | Terminal xterm.js render (tulisan muncul) | - | | |
| 23 | PTY spawn (shell prompt muncul) | - | | |
| 24 | PTY write (ketik di terminal) | - | | |
| 25 | Terminal auto-restart saat crash | - | | |
| 26 | Terminal manual restart (klik ↻) | - | | |
| 27 | Terminal close/open toggle (klik ✕/▷) | - | | |
| 28 | Terminal remove pane (klik 🗑) - custom dialog | - | | |
| 29 | Passthrough mode indicator (border kuning) | - | | |
| 30 | Passthrough toggle | Ctrl+Shift+Esc | | |
| 31 | Status dot per pane (idle/running/error) | - | | |
| 32 | Error message display di pane | - | | |
| 33 | **Search scrollback terminal** | Ctrl+F | | |
| 34 | **Custom pane name** (double-click rename) | - | | |

## Terminal Config

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 35 | Shell selector (PowerShell/CMD/WSL/Git Bash) | - | | |
| 36 | Working directory input | - | | |
| 37 | Browse folder button (native dialog) | - | | |
| 38 | Startup command input | - | | |
| 39 | Pane controls visible on hover | - | | |

## Modals & Dialogs

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 40 | Create Workspace modal | Ctrl+N | | |
| 41 | Fast Launch modal | Ctrl+K | | |
| 42 | Fast Launch - Enter key submits | Enter | | |
| 43 | Fast Launch - Browse folder button | - | | |
| 44 | Fast Launch - "Use current" folder button | - | | |
| 45 | Fast Launch - Pane count selector (1-9) | - | | |
| 46 | Shortcuts modal | Ctrl+. | | |
| 47 | Shortcuts modal - search filter | - | | |
| 48 | Shortcuts modal - focus trap (Tab tidak keluar) | Tab | | |
| 49 | ConfirmDialog - focus trap | Tab | | |
| 50 | PromptDialog - focus trap | Tab | | |
| 51 | ConfirmDialog - Esc to cancel | Esc | | |
| 52 | Color picker - arrow key navigation | Arrow | | |
| 53 | Folder picker - native dialog | - | | |
| 54 | **Close dialog 3 opsi** (Cancel/Save&Close/Close) | - | | |

## Quick Launch Presets

| # | Tool | Icon | Command | Panes | Status | Catatan |
|---|------|------|---------|-------|--------|---------|
| 55 | Claude Code | `C` | `claude` | 1 | | |
| 56 | OpenCode | `OC` | `opencode` | 1 | | |
| 57 | Codex | `Cx` | `codex` | 1 | | |
| 58 | Antigravity | `Ag` | `agy` | 1 | | |
| 59 | Cline | `Cl` | `cline` | 1 | | |
| 60 | Pi | `Pi` | `pi` | 1 | | |
| 61 | Qwen Code | `Qw` | `qwen` | 1 | | |
| 62 | Aider | `Ai` | `aider` | 1 | | |
| 63 | enowxai start | `En` | `enowxai start` | 1 | | |
| 64 | 9router | `9R` | `router` | 9 | | |

## Command Palette

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 65 | Buka command palette | Ctrl+Shift+P | | |
| 66 | Search/filter commands | Type | | |
| 67 | Navigate with arrow keys | ↑↓ | | |
| 68 | Execute command | Enter | | |
| 69 | Close palette | Esc | | |
| 70 | Switch workspace via palette | - | | |
| 71 | Create workspace via palette | - | | |
| 72 | Toggle sidebar via palette | - | | |
| 73 | Toggle passthrough via palette | - | | |

## Settings (Options Menu)

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 74 | Buka options menu | Ctrl+, | | |
| 75 | Theme picker (14 tema) | - | | |
| 76 | Light/Dark mode toggle | - | | |
| 77 | Font family selector | - | | |
| 78 | Font size slider (8-32) | - | | |
| 79 | Auto-restart toggle | - | | |
| 80 | Keybind customization (Record/Reset) | - | | |
| 81 | Keybind conflict detection | - | | |
| 82 | Config export | - | | |
| 83 | Config import | - | | |
| 84 | Template list | - | | |
| 85 | Template materialize | - | | |
| 86 | About section (app info) | - | | |
| 87 | **Terminal scrollback buffer size** | - | | |
| 88 | **Terminal bell behavior** | - | | |
| 89 | **Copy on select** | - | | |
| 90 | **Custom theme CSS textarea** | - | | |
| 91 | **Theme docs button** | - | | |
| 91a | **Passthrough default ON toggle** | - | | |
| 91b | **Quick launch in Add Terminal modal** | - | | |
| 91c | **Workspace switch keeps terminals alive** | Alt+1..9 | | |
| 91d | **Hover delay 200ms on pane controls** | - | | |
| 91e | **Quick launch toolbar (OpenCode/Claude/Codex)** | - | | |

## Themes (14 Total) — WCAG AA Audited

| # | Theme | Dark | Light | Terminal Colors | Status | Catatan |
|---|-------|------|-------|-----------------|--------|---------|
| 92 | Midnight | ✅ | ✅ | ✅ | | |
| 93 | Aurora | ✅ | ✅ | ✅ | | |
| 94 | Solarized | ✅ | ✅ | ✅ | | |
| 95 | Nord | ✅ | ✅ | ✅ | | |
| 96 | Dracula | ✅ | ✅ | ✅ | | |
| 97 | Monokai | ✅ | ✅ | ✅ | | |
| 98 | Tokyo Night | ✅ | ✅ | ✅ | | |
| 99 | Rose Pine | ✅ | ✅ | ✅ | | |
| 100 | **Catppuccin** | ✅ | ✅ | ✅ | | |
| 101 | **Gruvbox** | ✅ | ✅ | ✅ | | |
| 102 | **One Dark** | ✅ | ✅ | ✅ | | |
| 103 | **Synthwave** | ✅ | ✅ | ✅ | | |
| 104 | **Everforest** | ✅ | ✅ | ✅ | | |
| 105 | **Kanagawa** | ✅ | ✅ | ✅ | | |

## Recovery & Persistence

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 106 | Recovery banner muncul setelah dirty shutdown | Auto | | |
| 107 | Restore session dari recovery | - | | |
| 108 | Dismiss recovery banner | Esc / ✕ | | |
| 109 | Auto-save setiap 5 detik | Auto | | |
| 110 | Workspace state persist setelah restart | - | | |

## Log Viewer

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 111 | Toggle log viewer | - | | |
| 112 | Log level filter (ALL/ERROR/WARN/INFO/DEBUG) | - | | |
| 113 | Refresh logs | - | | |
| 114 | Auto-scroll saat log baru (hanya jika di bottom) | - | | |

## Accessibility (HCI)

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 115 | Semua button punya aria-label | - | | |
| 116 | Focus trap di semua modal | Tab | | |
| 117 | Focus ring visible saat keyboard nav | Tab | | |
| 118 | prefers-reduced-motion support | - | | |
| 119 | Theme contrast OK di light mode | - | | |
| 120 | Role="dialog" di modal (bukan backdrop) | - | | |
| 121 | Role="radio" di theme cards | - | | |
| 122 | Tidak ada native window.alert/confirm/prompt | - | | |

## Visual

| # | Feature | Shortcut | Status | Alasan / Catatan |
|---|---------|----------|--------|------------------|
| 123 | Dark mode rendering | - | | |
| 124 | Light mode rendering (tidak ada elemen invisible) | - | | |
| 125 | Scrollbar styling (6px, themed) | - | | |
| 126 | Animation pulse (spawning dot) | - | | |
| 127 | Animation spin (loading spinner) | - | | |
| 128 | Modal enter animation | - | | |
| 129 | Sidebar collapse animation | - | | |
| 130 | Empty state "N" icon (bukan "T") | - | | |
| 131 | Tool preset colored badges (bukan emoji) | - | | |
| 132 | Workspace tabs compact (10+ visible) | - | | |

## Performance

| # | Feature | Target | Status | Alasan / Catatan |
|---|---------|--------|--------|------------------|
| 133 | Cold start < 800ms | <800ms | | |
| 134 | Switch workspace < 100ms | <100ms | | |
| 135 | Spawn terminal < 150ms | <150ms | | |
| 136 | 9-pane idle memory < 200MB | <200MB | | |
| 137 | Grid resize >= 60fps | >=60fps | | |
| 138 | Auto-restart timeout cleanup (no leak) | - | | |
| 139 | UUID workspace IDs (no collision) | - | | |
| 140 | Error boundary per pane (no app crash) | - | | |

## 9 Claude Code Concurrent

| # | Feature | Status | Alasan / Catatan |
|---|---------|--------|------------------|
| 141 | Buka 9 pane sekaligus | | |
| 142 | Semua pane spawn PTY tanpa error | | |
| 143 | Semua pane bisa diketik | | |
| 144 | Switch workspace dengan 9 pane | | |
| 145 | Tidak ada memory leak setelah lama idle | | |
| 146 | Auto-restart works di semua pane | | |

## Terminal ANSI Colors

| # | Feature | Status | Alasan / Catatan |
|---|---------|--------|------------------|
| 147 | Black dari theme (--tw-panel) | | |
| 148 | Red dari theme (--tw-danger) | | |
| 149 | Green dari theme (--tw-success) | | |
| 150 | Yellow dari theme (--tw-warn) | | |
| 151 | Blue dari theme (--tw-info) | | |
| 152 | Magenta dari theme (--tw-accent) | | |
| 153 | Bright variants semua warna | | |
| 154 | Cursor dari accent color | | |
| 155 | Selection dari accent color | | |

---

## Ringkasan

| Kategori | Total | ✅ | ❌ | ⚠️ |
|----------|-------|---|---|---|
| Core Workspace | 15 | | | |
| Terminal Grid | 19 | | | |
| Terminal Config | 5 | | | |
| Modals & Dialogs | 15 | | | |
| Quick Launch Presets | 10 | | | |
| Command Palette | 9 | | | |
| Settings | 18 | | | |
| Themes | 14 | | | |
| Recovery | 5 | | | |
| Log Viewer | 4 | | | |
| Accessibility | 8 | | | |
| Visual | 10 | | | |
| Performance | 8 | | | |
| 9 Claude Code | 6 | | | |
| Terminal ANSI | 9 | | | |
| **TOTAL** | **155** | | | |

---

## Test Results (Automated)

| Test Suite | Total | Passed | Failed |
|-----------|-------|--------|--------|
| Unit Tests (Vitest) | 267 | 267 | 0 |
| E2E Tests (Playwright) | 23 | 23 | 0 |
| ESLint | - | 0 errors | 0 warnings |
| Vite Build | - | ✅ | - |
| Tauri Build | - | ✅ | - |

---

## Installer Locations

- **MSI:** `src-tauri\target\release\bundle\msi\Nonaterm_0.1.0_x64_en-US.msi`
- **EXE Setup:** `src-tauri\target\release\bundle\nsis\Nonaterm_0.1.0_x64-setup.exe`

## Cara Test

1. Install salah satu installer di atas
2. Buka Nonaterm
3. Checklist satu-satu dari tabel di atas
4. Isi kolom Status: ✅ / ❌ / ⚠️
5. Isi kolom Alasan kalau ada masalah
6. Kirim balik hasilnya
