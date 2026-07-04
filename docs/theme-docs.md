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

## All CSS Variables Reference

### Core Colors

| Variable | Description | Example (Midnight Dark) |
|----------|-------------|------------------------|
| `--tw-bg` | Main background | `#0c0a1a` |
| `--tw-bg-elev` | Elevated surfaces (sidebar, modals) | `#100e24` |
| `--tw-panel` | Panel/card background (with alpha) | `rgba(16, 14, 36, 0.94)` |
| `--tw-panel-solid` | Solid panel (no transparency) | `#15132d` |
| `--tw-panel-strong` | Stronger panel emphasis | `#1a1740` |
| `--tw-panel-border` | Border color | `rgba(167, 139, 250, 0.12)` |

### Text Colors

| Variable | Description | Example (Midnight Dark) |
|----------|-------------|------------------------|
| `--tw-text` | Primary text | `#f0ecff` |
| `--tw-text-muted` | Secondary text | `#afa6d6` |
| `--tw-text-subtle` | Tertiary/hint text | `rgba(240, 236, 255, 0.6)` |

### Accent Colors

| Variable | Description | Example (Midnight Dark) |
|----------|-------------|------------------------|
| `--tw-accent` | Accent/brand color | `#8b5cf6` |
| `--tw-accent-soft` | Accent at low opacity (hover states) | `rgba(139, 92, 246, 0.18)` |
| `--tw-accent-contrast` | Text on accent background | `#ffffff` |

### Semantic Colors

| Variable | Description | Example (Midnight Dark) |
|----------|-------------|------------------------|
| `--tw-danger` | Error/danger color | `#f43f5e` |
| `--tw-success` | Success color | `#10b981` |
| `--tw-warn` | Warning color | `#f59e0b` |
| `--tw-info` | Info color | `#6366f1` |

### Overlay & Shadows

| Variable | Description | Example (Midnight Dark) |
|----------|-------------|------------------------|
| `--tw-overlay` | Modal backdrop | `rgba(4, 2, 16, 0.82)` |
| `--tw-modal-backdrop` | Modal backdrop (animation-aware) | `rgba(4, 2, 16, 0.82)` |
| `--tw-modal-blur` | Modal backdrop blur | `8px` |
| `--tw-shadow-sm` | Small shadow | `0 2px 8px rgba(0,0,0,0.3)` |
| `--tw-shadow-md` | Medium shadow | `0 8px 28px rgba(0,0,0,0.4)` |
| `--tw-shadow-lg` | Large shadow | `0 16px 52px rgba(0,0,0,0.5)` |

### Border Radius

| Variable | Description | Value |
|----------|-------------|-------|
| `--tw-radius-xs` | Extra small radius | `4px` |
| `--tw-radius-sm` | Small radius | `6px` |
| `--tw-radius-md` | Medium radius | `12px` |
| `--tw-radius-lg` | Large radius | `18px` |
| `--tw-radius-xl` | Extra large radius | `26px` |

### Spacing

| Variable | Value |
|----------|-------|
| `--tw-space-1` | `0.25rem` |
| `--tw-space-2` | `0.5rem` |
| `--tw-space-3` | `0.75rem` |
| `--tw-space-4` | `1rem` |
| `--tw-space-5` | `1.25rem` |
| `--tw-space-6` | `1.5rem` |
| `--tw-space-8` | `2rem` |

### Typography

| Variable | Description | Default |
|----------|-------------|---------|
| `--tw-font-sans` | Sans-serif font stack | `'Inter var', Inter, 'Segoe UI', system-ui, sans-serif` |
| `--tw-font-mono` | Monospace font stack | `'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace` |
| `--tw-font-display` | Display font stack | `'Inter var', Inter, 'Segoe UI', system-ui, sans-serif` |
| `--tw-font-size` | Base font size | `13px` |
| `--tw-line-height` | Base line height | `1.5` |

### Motion & Animation

| Variable | Description | Default |
|----------|-------------|---------|
| `--tw-motion-fast` | Fast transition | `120ms` |
| `--tw-motion-med` | Medium transition | `220ms` |
| `--tw-ease` | Default easing | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| `--tw-modal-enter` | Modal enter easing | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--tw-modal-exit` | Modal exit easing | `cubic-bezier(0.7, 0, 0.84, 0)` |
| `--tw-modal-duration-enter` | Modal enter duration | `280ms` |
| `--tw-modal-duration-exit` | Modal exit duration | `200ms` |

### Layout

| Variable | Description | Default |
|----------|-------------|-------|
| `--tw-splitter-size` | Grid splitter thickness | `4px` |

### Accessibility

All themes respect `prefers-reduced-motion: reduce` — animations and transitions are disabled when the OS preference is set.

## Built-in Themes (14)

### Midnight (default)
- **Accent**: Purple `#8b5cf6`
- **Style**: Deep indigo with violet glow
- **Dark bg**: `#0c0a1a` | **Light bg**: `#f5f3ff`

### Aurora
- **Accent**: Cyan `#22d3ee`
- **Style**: Cyan on dark teal ocean
- **Dark bg**: `#041218` | **Light bg**: `#ecfeff`

### Solarized
- **Accent**: Amber `#cb9b51`
- **Style**: Warm amber on deep teal
- **Dark bg**: `#001e27` | **Light bg**: `#fdf6e3`

### Nord
- **Accent**: Blue `#88c0d0`
- **Style**: Arctic frost, cool & calm
- **Dark bg**: `#2e3440` | **Light bg**: `#eceff4`

### Dracula
- **Accent**: Purple `#bd93f9`
- **Style**: Purple on dark slate
- **Dark bg**: `#1e1f29` | **Light bg**: `#f8f8f2`

### Monokai
- **Accent**: Yellow `#e6db74`
- **Style**: Warm green + yellow retro
- **Dark bg**: `#1d1e19` | **Light bg**: `#faf9f5`

### Tokyo Night
- **Accent**: Violet `#bb9af7`
- **Style**: Deep violet with pink/neon
- **Dark bg**: `#1a1b2e` | **Light bg**: `#e9ecef`

### Rose Pine
- **Accent**: Rose `#eb6f92`
- **Style**: Soft rose on dark wood
- **Dark bg**: `#191724` | **Light bg**: `#faf4ed`

### Catppuccin
- **Accent**: Pink `#f5c2e7`
- **Style**: Pastel cream on warm mocha
- **Dark bg**: `#1e1e2e` | **Light bg**: `#eff1f5`

### Gruvbox
- **Accent**: Orange `#fe8019`
- **Style**: Retro warm orange on dark earth
- **Dark bg**: `#1d2021` | **Light bg**: `#fbf1c7`

### One Dark
- **Accent**: Blue `#61afef`
- **Style**: Atom's iconic dark palette
- **Dark bg**: `#21252b` | **Light bg**: `#fafafa`

### Synthwave
- **Accent**: Pink `#f97bbb`
- **Style**: Neon pink on deep purple night
- **Dark bg**: `#130824` | **Light bg**: `#fef4ff`

### Everforest
- **Accent**: Green `#a7c080`
- **Style**: Forest green on warm dark
- **Dark bg**: `#1e2326` | **Light bg**: `#f8f5ef`

### Kanagawa
- **Accent**: Red `#c34043`
- **Style**: Japanese ink with autumn red
- **Dark bg**: `#1f1f28` | **Light bg**: `#f2ecbc`

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

### Full Custom Theme Example

```css
/* Cyberpunk Neon */
--tw-bg: #0a0a0f;
--tw-bg-elev: #12121a;
--tw-panel: rgba(18, 18, 26, 0.95);
--tw-panel-solid: #16161f;
--tw-panel-strong: #1c1c28;
--tw-panel-border: rgba(0, 255, 170, 0.15);
--tw-text: #e0ffe0;
--tw-text-muted: #88ccaa;
--tw-text-subtle: rgba(224, 255, 224, 0.5);
--tw-accent: #00ffaa;
--tw-accent-soft: rgba(0, 255, 170, 0.15);
--tw-accent-contrast: #0a0a0f;
--tw-danger: #ff3366;
--tw-success: #00ffaa;
--tw-warn: #ffcc00;
--tw-info: #00ccff;
--tw-overlay: rgba(5, 5, 10, 0.88);
```

Changes apply instantly — no restart needed.

## Theme Architecture

Themes work via CSS custom properties and data attributes:

1. `data-theme` on `<html>` — sets `"dark"` or `"light"`
2. `data-theme-id` on `<html>` — sets the theme name (e.g. `"midnight"`)
3. CSS selectors like `[data-theme-id='aurora'][data-theme='dark']` override variables
4. The accent color is also set via JS: `root.style.setProperty('--tw-accent', def.accent)`

This means custom CSS in the textarea can override any variable for any theme/mode combination.
