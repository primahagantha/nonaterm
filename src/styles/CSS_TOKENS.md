# Nonaterm CSS Token System

## Architecture

```
tokens.css    → Design tokens (colors, spacing, typography, themes)
app.css       → Component styles (BEM naming)
modals.css    → Modal-specific overrides
```

## Token Categories

### Colors (`--tw-*`)

| Token | Purpose | Example |
|-------|---------|---------|
| `--tw-bg` | App background | `#0c0a1a` |
| `--tw-bg-elev` | Elevated surfaces (panels, modals) | `#100e24` |
| `--tw-panel` | Panel/card background (may be translucent) | `rgba(16, 14, 36, 0.94)` |
| `--tw-panel-solid` | Opaque panel background | `#15132d` |
| `--tw-panel-strong` | Stronger panel variant | `#1a1740` |
| `--tw-panel-border` | Border color for panels/cards | `rgba(167, 139, 250, 0.12)` |
| `--tw-text` | Primary text | `#f0ecff` |
| `--tw-text-muted` | Secondary/muted text | `#9a8fcc` |
| `--tw-text-subtle` | Very faint text (hints, placeholders) | `rgba(240, 236, 255, 0.55)` |
| `--tw-accent` | Primary accent (buttons, links, focus) | `#8b5cf6` |
| `--tw-accent-soft` | Soft accent background (hover, selected) | `rgba(139, 92, 246, 0.18)` |
| `--tw-accent-contrast` | Text on accent background | `#ffffff` |
| `--tw-danger` | Error/danger state | `#f43f5e` |
| `--tw-success` | Success state | `#10b981` |
| `--tw-warn` | Warning state | `#f59e0b` |
| `--tw-info` | Info state | `#6366f1` |
| `--tw-overlay` | Backdrop overlay | `rgba(4, 2, 16, 0.82)` |

### Spacing (`--tw-space-*`)

| Token | Value |
|-------|-------|
| `--tw-space-1` | `0.25rem` (4px) |
| `--tw-space-2` | `0.5rem` (8px) |
| `--tw-space-3` | `0.75rem` (12px) |
| `--tw-space-4` | `1rem` (16px) |
| `--tw-space-5` | `1.25rem` (20px) |
| `--tw-space-6` | `1.5rem` (24px) |
| `--tw-space-8` | `2rem` (32px) |

### Typography

| Token | Purpose | Default |
|-------|---------|---------|
| `--tw-font-sans` | UI text | `'Inter var', Inter, 'Segoe UI', system-ui, sans-serif` |
| `--tw-font-mono` | Code/terminal | `'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace` |
| `--tw-font-display` | Headings | Same as sans |
| `--tw-font-size` | Base font size | `13px` |
| `--tw-line-height` | Base line height | `1.5` |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--tw-radius-xs` | `4px` | Small badges, chips |
| `--tw-radius-sm` | `6px` | Buttons, inputs |
| `--tw-radius-md` | `12px` | Cards, panels |
| `--tw-radius-lg` | `18px` | Modals |
| `--tw-radius-xl` | `26px` | Large containers |

### Motion

| Token | Value | Use |
|-------|-------|-----|
| `--tw-motion-fast` | `120ms` | Hover, focus transitions |
| `--tw-motion-med` | `220ms` | Panel open/close, theme switch |
| `--tw-ease` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Snappy ease-out |

### Shadows

| Token | Use |
|-------|-----|
| `--tw-shadow-sm` | Subtle elevation (badges, tooltips) |
| `--tw-shadow-md` | Medium elevation (dropdowns) |
| `--tw-shadow-lg` | High elevation (modals, popovers) |

## Theme System

### How Themes Work

1. `data-theme` attribute on `<html>`: `'dark'` or `'light'`
2. `data-theme-id` attribute on `<html>`: theme name (e.g., `'midnight'`, `'catppuccin'`)
3. CSS selectors `[data-theme-id='X'][data-theme='Y']` override tokens
4. JS also sets `--tw-accent` inline via `applyTheme()` for instant preview

### Theme Token Override Pattern

Each theme overrides a subset of tokens. Minimum required:
- `--tw-bg`, `--tw-bg-elev`
- `--tw-panel`, `--tw-panel-border`
- `--tw-text`, `--tw-text-muted`
- `--tw-accent`, `--tw-accent-soft`

Optional (for full control):
- `--tw-danger`, `--tw-success`, `--tw-warn`, `--tw-info`
- `--tw-accent-contrast` (for light themes with bright accents)
- `--tw-modal-backdrop`

### Terminal Color Mapping

The terminal (xterm.js) reads theme tokens at spawn time:

| ANSI Color | Token |
|------------|-------|
| Black | `--tw-panel` |
| Red | `--tw-danger` |
| Green | `--tw-success` |
| Yellow | `--tw-warn` |
| Blue | `--tw-info` |
| Magenta | `--tw-accent` |
| Cyan | Hardcoded `#06b6d4` |
| White | `--tw-text` |
| Background | `--tw-bg-elev` |
| Foreground | `--tw-text` |
| Cursor | `--tw-accent` |

## BEM Naming Convention

```
.block                    → Component root
.block__element           → Child element
.block--modifier          → Variant/state
.block__element--modifier → Child variant

Examples:
.terminal-pane              → Pane container
.terminal-pane__header      → Pane header
.terminal-pane--focused     → Focused state
.terminal-pane__action--danger → Danger action button
```

## Component Index

### Shell (`app.css`)
- `.app-shell` — Root grid layout
- `.workspace-sidebar` — Left sidebar
- `.workspace-list` — Workspace list container
- `.workspace-header` — Top header bar
- `.options-menu` — Settings dropdown
- `.shortcuts-modal` — Keyboard shortcuts modal

### Terminal (`app.css`)
- `.terminal-grid` — Grid layout for panes
- `.terminal-pane` — Individual pane wrapper
- `.terminal-pane__header` — Pane header (title, actions)
- `.terminal-pane__controls` — Pane config bar (shell, cwd, startup)
- `.terminal-pane__body` — Terminal content area
- `.xterm-surface` — xterm.js container

### Modals (`modals.css`)
- `.modal-backdrop` — Full-screen overlay
- `.modal-dialog` — Dialog container
- `.modal-field` — Form field group
- `.tool-preset` — Quick launch tool card
- `.color-picker` — Accent color picker

### Shared (`app.css`)
- `.btn` — Button base (variants: `--primary`, `--secondary`, `--ghost`, `--danger`, `--sm`, `--icon`)
- `.kbd-hint` — Keyboard shortcut badge
- `.empty-state` — Empty state placeholder
- `.slider` — Range input

## Accessibility

- `@media (prefers-reduced-motion: reduce)` disables all animations
- `:focus-visible` provides 2px accent outline
- All interactive elements have `aria-label` or visible text
- Modals use `role="dialog"` + `aria-modal="true"`
- Theme cards use `role="radio"` + `aria-checked`
