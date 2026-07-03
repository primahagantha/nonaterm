# Nonaterm Theme Guide

## How to Use Themes

1. Open **Options** (Ctrl+,)
2. Go to **Appearance** tab
3. Pick a theme from the grid
4. Toggle **Light/Dark** mode

## Custom Theme CSS

Override any theme variable in the **Custom theme CSS** textarea:

```css
--tw-bg: #0a0a0a;
--tw-accent: #ff6b6b;
--tw-text: #e0e0e0;
```

## Available Variables

| Variable | Description |
|----------|-------------|
| `--tw-bg` | Main background |
| `--tw-bg-elev` | Elevated surfaces (sidebar, modals) |
| `--tw-panel` | Panel/card background |
| `--tw-panel-solid` | Solid panel (no transparency) |
| `--tw-panel-border` | Border color |
| `--tw-text` | Primary text |
| `--tw-text-muted` | Secondary text |
| `--tw-text-subtle` | Tertiary/hint text |
| `--tw-accent` | Accent/brand color |
| `--tw-accent-soft` | Accent at low opacity (hover states) |
| `--tw-accent-contrast` | Text on accent background |
| `--tw-danger` | Error/danger color |
| `--tw-success` | Success color |
| `--tw-warn` | Warning color |
| `--tw-info` | Info color |
| `--tw-overlay` | Modal backdrop |

## Built-in Themes (14)

| Theme | Accent | Style |
|-------|--------|-------|
| Midnight | Purple | Deep indigo with violet glow |
| Aurora | Cyan | Cyan on dark teal ocean |
| Solarized | Amber | Warm amber on deep teal |
| Nord | Blue | Arctic frost, cool & calm |
| Dracula | Purple | Purple on dark slate |
| Monokai | Yellow | Warm green + yellow retro |
| Tokyo Night | Violet | Deep violet with pink/neon |
| Rose Pine | Rose | Soft rose on dark wood |
| Catppuccin | Pink | Pastel cream on warm mocha |
| Gruvbox | Orange | Retro warm orange on dark earth |
| One Dark | Blue | Atom's iconic dark palette |
| Synthwave | Pink | Neon pink on deep purple night |
| Everforest | Green | Forest green on warm dark |
| Kanagawa | Red | Japanese ink with autumn red |

## WCAG Compliance

All themes meet WCAG AA contrast requirements:
- Primary text: >= 4.5:1 contrast ratio
- Muted text: >= 4.5:1 (or >= 3:1 for large text)
- All themes audited for both light and dark modes

## Creating Your Own Theme

Add CSS overrides in the Custom Theme CSS field. Example:

```css
/* Dracula-inspired custom */
--tw-bg: #282a36;
--tw-bg-elev: #343746;
--tw-accent: #ff79c6;
--tw-text: #f8f8f2;
--tw-danger: #ff5555;
--tw-success: #50fa7b;
```

Changes apply instantly — no restart needed.
