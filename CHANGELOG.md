# Changelog

All notable changes to Nonaterm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Passthrough mode ON by default for new panes (toggleable in Options)
- Quick launch toolbar with OpenCode, Claude Code, Codex + custom tools
- Quick launch tool presets in "Add Terminal" modal
- Workspace switch keeps terminals alive (all grids rendered, inactive hidden)
- Hover delay 200ms on pane controls to prevent accidental triggers
- WCAG AA theme contrast audit — fixed rose-pine-light and tokyo-light
- Theme documentation (`docs/theme-docs.md`)
- Build quality gate scripts (`build.bat`, `build.sh`)
- Release scripts (`scripts/release.sh`, `scripts/release.bat`)

### Fixed
- Font setting not being applied (added `term.refresh()` after font change)
- Duplicate "Open app" button removed from pane header
- Theme docs link now points to correct repository
- Lint script scoped to `src/` directory

### Changed
- FEATURE_CHECKLIST.md updated with new features (155 items)
- CI workflow branch reference updated to `master`

## [0.1.0] - 2025-07-03

### Added
- Initial release
- 14 themes with light/dark modes
- Workspace manager with up to 9 terminal panes
- Quick launch for CLI coding agents (Claude, OpenCode, Codex, etc.)
- Passthrough mode for TUI apps
- Grid/vertical-tabs layout modes
- Auto-restart on terminal crash
- Keyboard shortcut customization
- Config export/import
- Template system
- Recovery from dirty shutdown
- Log viewer
- AI settings panel
- SSH Vault
- Snippet manager
- Global hotkey support
