# Design Spec: V1 Blocking Features

**Date**: 2026-07-03
**Status**: Approved
**Features**: 4 (Passthrough Toggle, Global Hotkey, Search Scrollback, Release Signing)

---

## 1. Passthrough Mode UI Toggle

### Overview
Add a per-pane toggle button in the terminal header that activates Passthrough Mode, allowing all keyboard input to pass directly to the PTY without app-level shortcut interception.

### Architecture
```
TerminalPanePlaceholder.tsx
├── Header (existing)
│   ├── Title
│   ├── Status dot
│   ├── [NEW] Passthrough toggle button (⇄)
│   └── Actions (restart, close)
└── XtermTerminal (existing)
```

### Data Flow
```
Click toggle button
  → settingsStore.togglePassthrough(paneId)
  → settingsStore.passthroughPanes[] updated
  → useKeybind hook reads passthroughPanes on every keydown
  → if paneId in passthroughPanes: skip app-level shortcuts, forward to PTY
```

### UI Spec
- **Button**: `⇄` icon, 24x24, positioned before restart button in pane header
- **Active state**: `border-left: 3px solid var(--tw-accent)` on pane, button gets `--tw-accent` background
- **Tooltip**: "Passthrough Mode: ON/OFF (Ctrl+Shift+Esc)"
- **CSS class**: `.terminal-pane__passthrough-btn` + `.terminal-pane__passthrough-btn--active`

### Files to Modify
1. `src/components/terminal/TerminalPanePlaceholder.tsx` — add toggle button
2. `src/styles/app.css` — passthrough indicator styles
3. `tests/frontend/passthrough.test.tsx` — unit tests

### Acceptance Criteria
- Toggle button visible in every pane header
- Click toggles passthrough state in settingsStore
- Visual indicator (border glow) shows when active
- App-level shortcuts (Ctrl+Shift+P, Ctrl+., etc.) skip when passthrough is ON
- PTY receives all keystrokes when passthrough is ON
- State persists across app restart (localStorage)
- Unit tests: toggle, visual state, keyboard forwarding

---

## 2. Global Hotkey Show/Hide

### Overview
Implement a system-wide hotkey that toggles the Nonaterm window visibility (show/hide) from any application. User-configured, no default hardcoded.

### Architecture
```
src-tauri/src/lib.rs (setup)
  → tauri_plugin_global_shortcut::register(hotkey)
  → on_trigger: window.show() / window.hide() / window.set_focus()

src/stores/settingsStore.ts
  → globalHotkey: string (e.g., "Ctrl+Shift+`")
  → user configurable in Settings > General
```

### Data Flow
```
App startup
  → read globalHotkey from settings
  → register with tauri-plugin-global-shortcut
  → on trigger: toggle window visibility

User changes hotkey in Settings
  → unregister old hotkey
  → register new hotkey
  → persist to settings JSON
```

### UI Spec
- **Settings**: Input field di Settings > General > "Global Hotkey"
- **Recording mode**: Click input → press keys → capture combo → save
- **Default**: Empty (user must configure)
- **Warning**: Show conflict warning if combo matches existing app shortcut

### Files to Modify
1. `src-tauri/Cargo.toml` — add `tauri-plugin-global-shortcut` dependency
2. `src-tauri/src/lib.rs` — register plugin + hotkey in setup
3. `src-tauri/src/commands/system.rs` — `system_set_global_hotkey` command
4. `src/stores/settingsStore.ts` — `globalHotkey` field + setter
5. `src/components/shell/OptionsMenu.tsx` — hotkey input in General tab
6. `tests/frontend/globalHotkey.test.tsx` — unit tests

### Acceptance Criteria
- Plugin installed and registered
- Hotkey configurable in Settings > General
- Press hotkey toggles window visibility (show/hide)
- Window gets focus when shown
- Hotkey persists across app restart
- Empty hotkey = no global shortcut registered
- Unit tests: registration, toggle, persistence

---

## 3. Search Scrollback

### Overview
Add inline search bar to terminal panes using the existing `@xterm/addon-search` addon. Ctrl+F opens search, Enter/Shift+Enter navigates matches.

### Architecture
```
XtermTerminal.tsx
  ├── SearchAddon (@xterm/addon-search) — already loaded
  ├── [NEW] SearchBar component (inline, top of terminal)
  └── Keyboard handler (Ctrl+F → show search bar)
```

### Data Flow
```
Ctrl+F pressed (in terminal pane)
  → show search bar
  → user types query
  → searchAddon.findNext(query) / findPrevious(query)
  → Enter → next match
  → Shift+Enter → previous match
  → Escape → close search bar, clear highlights
```

### UI Spec
- **Position**: Absolute, top of terminal surface, full width
- **Height**: 32px, dark background (`--tw-bg-elev`)
- **Input**: Text field with placeholder "Search..."
- **Buttons**: `↑` (previous), `↓` (next), `✕` (close)
- **Match count**: "3/15" indicator
- **Shortcut**: Ctrl+F to open, Escape to close, Enter/Shift+Enter to navigate

### Files to Modify
1. `src/components/terminal/XtermTerminal.tsx` — add SearchBar + keyboard handler
2. `src/components/terminal/SearchBar.tsx` — new component
3. `src/styles/app.css` — search bar styles
4. `tests/frontend/searchBar.test.tsx` — unit tests
5. `tests/e2e/search-scrollback.spec.ts` — E2E test

### Acceptance Criteria
- Ctrl+F opens search bar in terminal pane
- Typing highlights matches in scrollback
- Enter navigates to next match
- Shift+Enter navigates to previous match
- Escape closes search bar and clears highlights
- Match count displayed (e.g., "3/15")
- Search bar doesn't overlap terminal content (pushes down)
- Unit tests: open, close, find next/prev, match count
- E2E test: Ctrl+F flow

---

## 4. Release Signing

### Overview
Set GitHub repository secrets for Tauri release signing so CI can produce signed artifacts automatically.

### Architecture
```
GitHub Repository Secrets
  ├── TAURI_SIGNING_PRIVATE_KEY (content of keys/nonaterm)
  └── TAURI_SIGNING_PRIVATE_KEY_PASSWORD

.github/workflows/release.yml
  └── Already reads these secrets for signing
```

### Steps
1. Read private key from `keys/nonaterm`
2. Set GitHub secret `TAURI_SIGNING_PRIVATE_KEY` via `gh secret set`
3. Set GitHub secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` via `gh secret set`
4. Verify CI workflow references these secrets correctly
5. Test with a draft release

### Files to Modify
1. `.github/workflows/release.yml` — verify secret references (should already be correct)
2. `RELEASE_SIGNING.md` — update with setup instructions

### Acceptance Criteria
- GitHub secrets set correctly
- CI workflow can read secrets
- Release build produces signed artifacts
- `latest.json` manifest generated with signatures
- Documentation updated

---

## Implementation Order

1. **Passthrough Mode UI Toggle** — most user-facing, backend ready
2. **Global Hotkey Show/Hide** — requires new plugin dependency
3. **Search Scrollback** — addon already installed, wire UI
4. **Release Signing** — infrastructure only, no code changes

## Testing Strategy

Each feature follows the loop engineering pattern:
1. Write unit tests first (TDD)
2. Implement feature
3. Run unit tests → fix until pass
4. Write E2E tests
5. Run E2E tests → fix until pass
6. Code review (multi-model)
7. Fix review findings
8. Move to next feature

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Global shortcut conflicts with other apps | Medium | Medium | User-configured only, no default |
| Search bar overlaps terminal content | Low | Low | Absolute positioning with z-index |
| Passthrough state not persisting | Low | Medium | Already stored in localStorage |
| GitHub secrets not accessible in CI | Low | High | Verify with `gh secret list` |
