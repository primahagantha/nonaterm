# Contributing to Nonaterm

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Release Process](#release-process)

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to build something useful.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nonaterm.git`
3. Create a branch: `git checkout -b feat/my-feature`
4. Make your changes
5. Push and create a PR

## Development Setup

### Prerequisites

- **Node.js** 20+
- **Rust** (latest stable) — [rustup.rs](https://rustup.rs/)
- **Windows**: WebView2 (built into Windows 11)
- **macOS**: `xcode-select --install`
- **Linux**: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf`

### Setup

```bash
npm install
npm run tauri dev
```

### Frontend Only (browser mode)

```bash
npm run dev
```

## Branch Naming

| Prefix | Use Case |
|--------|----------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code restructuring |
| `docs/` | Documentation |
| `test/` | Adding tests |
| `perf/` | Performance improvement |
| `chore/` | Maintenance tasks |

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | minor |
| `fix` | Bug fix | patch |
| `docs` | Documentation | patch |
| `style` | Formatting (no code change) | — |
| `refactor` | Code restructuring | patch |
| `perf` | Performance improvement | patch |
| `test` | Adding/correcting tests | — |
| `build` | Build system changes | — |
| `ci` | CI configuration | — |
| `chore` | Maintenance | — |

### Breaking Changes

Add `BREAKING CHANGE:` in the footer or `!` after the type:

```
feat!: remove deprecated API

BREAKING CHANGE: The oldMethod() has been removed.
```

### Examples

```
feat(workspace): add drag-and-drop pane reordering
fix(terminal): prevent PTY leak on workspace switch
docs: update install instructions for Linux
perf(grid): optimize 9-pane render with virtual scrolling
test(passthrough): add E2E tests for TUI app detection
```

## Pull Request Process

1. **One concern per PR** — keep PRs focused
2. **Prefer diffs under 500 LOC** — split large changes
3. **Include testing notes** — describe what you tested
4. **Link related issues** — use `Fixes #123`
5. **Update docs** — if behavior changes, update relevant docs
6. **Add tests** — new features need tests

### PR Template

```markdown
## What

Brief description of the change.

## Why

Why this change is needed.

## How

Implementation details.

## Testing

How you tested this change.

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Documentation updated (if needed)
- [ ] Tests added (if new feature)
```

## Code Style

### TypeScript / React

- **Format**: Prettier (2 spaces, single quotes, trailing comma)
- **Lint**: ESLint with `@typescript-eslint/recommended`
- **Naming**: `camelCase` for variables/functions, `PascalCase` for components/types
- **Props**: Always typed with interfaces
- **State**: Zustand stores, one per domain
- **CSS**: Custom properties for theming, BEM-ish naming

### Rust

- **Format**: `rustfmt` (default settings)
- **Lint**: `clippy` with `-D warnings`
- **Naming**: `snake_case` for functions/variables, `PascalCase` for types
- **Error handling**: `thiserror` for custom errors, `anyhow` for application-level
- **Async**: `tokio` runtime, `async`/`await` pattern
- **Docs**: `///` doc comments on public items

## Testing

### Required Checks

Before submitting a PR, run:

```bash
# Frontend
npm run typecheck
npm run lint
npm run test

# Backend
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test

# Full quality gate (Windows)
build.bat

# Full quality gate (Linux/macOS)
./build.sh
```

### Test Types

| Suite | Command | Purpose |
|-------|---------|---------|
| Unit | `npm run test` | Component and store logic |
| E2E | `npm run test:e2e` | User flows (Playwright) |
| Perf | `npm run test:perf` | Performance regression |
| Stress | `npm run test:stress` | 9-pane load testing |

### Writing Tests

- **Unit tests**: Place in `tests/frontend/` alongside the component
- **E2E tests**: Place in `tests/e2e/`
- **Naming**: `featureName.test.tsx` for unit, `feature.spec.ts` for E2E
- **Pattern**: Arrange → Act → Assert

## Release Process

See [docs/RELEASING.md](docs/RELEASING.md) for the full release process.

Quick version bump:

```bash
# Windows
scripts\release.bat patch

# Linux/macOS
./scripts/release.sh patch

git push && git push --tags
```

## Architecture Overview

```
Frontend (React + TS)  ←→  Tauri IPC  ←→  Backend (Rust)
     ↓                                        ↓
  Zustand stores                          PTY sessions
  xterm.js rendering                      SQLite persistence
  CSS custom props                        File system
```

### Key Patterns

- **IPC**: Tauri commands for request-response, events for streaming
- **State**: Zustand stores per domain (workspace, terminal, settings, ui)
- **Theming**: CSS custom properties in `tokens.css`
- **PTY lifecycle**: spawn → write → resize → close → restart

## Questions?

Open a [Discussion](https://github.com/RegenadeJester/nonaterm/discussions) or join the conversation!
