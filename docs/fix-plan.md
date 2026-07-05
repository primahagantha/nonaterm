# Fix Plan: Terminal Init, Detach, Switch, Settings UI

## Step 1 — Fix terminal pane initialization failure

Terminal panes show "Failed to initialize terminal pane" error. The PTY spawn fails because shell path resolution is broken. Fix the shell resolver to fallback gracefully and ensure ptySpawn doesn't throw on missing shell.

**Acceptance:**
- Terminal panes open without error on fresh launch
- Quick launch (claude, opencode, codex) starts terminal immediately
- Shell fallback works when configured shell is missing

## Step 2 — Fix detach workspace to new window

Detaching workspace via drag or button causes terminal errors. The workspaceOpenInNewWindow Tauri command needs proper error handling and the detached window needs to initialize its own PTY sessions.

**Acceptance:**
- Detach button works without error
- Detached window shows terminal content
- No "Failed to initialize" errors in detached window

## Step 3 — Fix workspace quick switch reliability

Cursor-based workspace switching sometimes fails to switch. The setActiveWorkspace call needs debouncing and the sidebar click handler needs to prevent stale closures.

**Acceptance:**
- Clicking workspace in sidebar always switches
- No lag or missed clicks during rapid switching
- Active workspace indicator updates immediately

## Step 4 — Fix Settings panel UI

Settings panel buttons and layout look bad. Adjust button sizes, spacing, and make the developer diagnostics toggle a proper toggle switch instead of checkbox. Move logs toggle to About section.

**Acceptance:**
- Settings panel buttons are properly sized and spaced
- Developer diagnostics toggle is a clean switch UI
- Logs toggle is in About section, off by default
- All settings content visible without horizontal scroll

## Step 5 — Run full test suite and build

Verify all fixes work together. Run Playwright E2E, WebDriver native, unit tests, lint, TypeScript check, and release build.

**Acceptance:**
- 67/67 Playwright pass
- 23/23 WebDriver pass
- 269/269 unit pass
- TypeScript + ESLint clean
- Release build succeeds
