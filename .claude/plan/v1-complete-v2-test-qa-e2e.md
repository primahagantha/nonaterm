# Plan: V1 Completion + V2 Test/QA/E2E Orchestration

## Status: Ready for Review
## Date: 2026-07-03

---

## Part 1: V1 Problems & Risks Inventory

### Severity: HIGH

| # | Issue | Status | Action |
|---|-------|--------|--------|
| H1 | `perf:check` CI gate non-blocking (`continue-on-error: true`) due to `idle.rss_delta_bytes` noise | Risk | Add median-of-3 sampling to stabilize; promote to blocking |
| H2 | Global hotkey plugin (PRD S17 Layer 1) not implemented | Gap | Implement `tauri-plugin-global-shortcut` for show/hide app |
| H3 | E2E tests use mock Tauri runtime, not real runtime | Risk | Add real Tauri E2E test harness for critical flows |
| H4 | Command palette E2E tests skip (2 tests) | Gap | Fix keyboard shortcut wiring in browser mock or mark as real-runtime-only |
| H5 | No accessibility testing (WCAG) | Gap | Add axe-core Playwright integration for critical pages |

### Severity: MEDIUM

| # | Issue | Status | Action |
|---|-------|--------|--------|
| M1 | Auto-restart policy not configurable (PRD S8) | Gap | Add configurable restart policy (max retries, backoff) |
| M2 | Copy/paste basic only — no multiline paste confirmation (PRD S8) | Gap | Add paste confirmation dialog for multiline |
| M3 | V2 components exist but lack unit tests | Gap | Add tests for AttentionInbox, BroadcastPanel, TokenMeter, DiffStrip, CommandPalette |
| M4 | Stress tests only 3 files | Gap | Add stress tests for: concurrent workspace CRUD, rapid pane spawn/close, multi-window |
| M5 | No E2E for: workspace templates, keybind customization, themes, multi-window | Gap | Add E2E specs for these flows |
| M6 | E2E coverage for PRD S12 flows incomplete | Gap | Add E2E for Flow D (close workspace), Flow F (git worktree binding), Flow H (keybind conflict warning) |

### Severity: LOW

| # | Issue | Status | Action |
|---|-------|--------|--------|
| L1 | No visual regression testing | Nice-to-have | Add Percy or Playwright screenshot comparison |
| L2 | No E2E for update checker | Nice-to-have | Add mock update flow E2E |
| L3 | TypeScript `any` usage not audited | Nice-to-have | Run `@typescript-eslint/no-explicit-any` check |

---

## Part 2: V1 Completion Tasks

### Task V1.1: Fix Command Palette E2E Skip [H4]
- Wire `Ctrl+Shift+P` in browser mock mode via `addInitScript` keyboard dispatch
- Remove `test.skip()` from `command-palette.spec.ts`
- Files: `tests/e2e/command-palette.spec.ts`, `tests/e2e/helpers.ts`

### Task V1.2: Stabilize Perf CI Gate [H1]
- Implement median-of-3 probe runs in `scripts/perf-check.mjs`
- Add warmup run (discard first measurement)
- Promote to blocking gate after stabilization
- Files: `scripts/perf-check.mjs`, `.github/workflows/ci.yml`

### Task V1.3: Configurable Auto-Restart Policy [M1]
- Add `max_retries` + `backoff_ms` fields to `PtySession`
- Add `pty_set_restart_policy` Tauri command
- Frontend: settings panel for restart policy per-pane
- Files: `src-tauri/src/pty/session.rs`, `src-tauri/src/commands/pty.rs`, `src/stores/settingsStore.ts`

### Task V1.4: Multiline Paste Confirmation [M2]
- Intercept paste event in `XtermTerminal`
- Show confirmation dialog if paste contains newlines
- Configurable in settings (enable/disable)
- Files: `src/components/terminal/XtermTerminal.tsx`, `src/components/shell/Dialogs.tsx`

---

## Part 3: V2 Test/QA/E2E Orchestration

### Phase 1: E2E Coverage Expansion (Critical PRD Flows)

| Spec File | PRD Flow | Priority |
|-----------|----------|----------|
| `workspace-close.spec.ts` | Flow D — Close with active processes | P0 |
| `config-export-import.spec.ts` | Flow — Export/import config | P0 (exists, expand) |
| `recovery-flow.spec.ts` | Flow E — Crash recovery | P0 (exists, expand) |
| `terminal-pane.spec.ts` | Grid lifecycle | P0 (exists, expand) |
| `keybind-customization.spec.ts` | Flow H — Keybind conflict warning | P1 |
| `workspace-templates.spec.ts` | Templates materialize | P1 |
| `theme-switcher.spec.ts` | Theme apply + persistence | P1 |
| `multi-window.spec.ts` | Flow I — Detach workspace | P2 |
| `grid-resize.spec.ts` | Flow J — Resize/rearrange | P2 |
| `update-checker.spec.ts` | Update notification flow | P2 |

### Phase 2: Component Unit Tests (V2 Features)

| Component | Test File | Coverage Target |
|-----------|-----------|-----------------|
| `AttentionInbox` | `attentionInbox.test.tsx` | Error detection, click-to-focus, badge count |
| `BroadcastPanel` | `broadcastPanel.test.tsx` | Terminal selection, input dispatch |
| `TokenMeter` | `tokenMeter.test.tsx` | Cost aggregation, display |
| `DiffStrip` | `diffStrip.test.tsx` | Diff rendering, click-to-expand |
| `CommandPalette` | `commandPalette.test.tsx` | Search, filter, execute, Esc close |
| `WorkspaceWidget` | `workspaceWidget.test.tsx` | Notes CRUD, expand/collapse |
| `VerticalTabs` | `verticalTabs.test.tsx` | View mode toggle, pane list |
| `QuickSelect` | `quickSelect.test.tsx` | Pattern highlight, keyboard select |
| `BlockOverlay` | `blockOverlay.test.tsx` | Collapse/expand, copy |

### Phase 3: Stress Tests Expansion

| Scenario | File | Target |
|----------|------|--------|
| Concurrent workspace CRUD (10 rapid creates/deletes) | `workspace-concurrent.stress.test.ts` | No crash, state consistent |
| Rapid pane spawn/close (9 panes x 5 cycles) | `pane-lifecycle.stress.test.ts` | No leak, cleanup complete |
| Settings store rapid updates | `settings-rapid.stress.test.ts` | No race, last-write-wins |
| Autosave under rapid state changes | `autosave-stress.stress.test.ts` | Debounce works, no corruption |

### Phase 4: Accessibility Testing

- Install `@axe-core/playwright`
- Add `a11y.spec.ts` E2E with axe checks on:
  - App shell (sidebar + grid)
  - Options menu
  - Recovery banner
  - Command palette
  - Dialogs (confirm, prompt)
- Target: 0 critical/serious violations

### Phase 5: Perf Regression Stabilization

- Median-of-3 in `perf-check.mjs`
- Warmup run before measurement
- Promote `perf-probe` to blocking CI gate
- Add cold-start metric to CI gate

---

## Part 4: Execution Order

```
Week 1: V1 Quick Fixes
  +-- V1.1: Fix command palette E2E skip
  +-- V1.2: Stabilize perf CI gate
  +-- V1.4: Multiline paste confirmation

Week 2: E2E Expansion Phase 1
  +-- workspace-close.spec.ts (expand)
  +-- keybind-customization.spec.ts (new)
  +-- workspace-templates.spec.ts (new)
  +-- theme-switcher.spec.ts (new)

Week 3: Component Tests + Stress
  +-- Phase 2: V2 component unit tests
  +-- Phase 3: Stress test expansion

Week 4: A11y + Perf Gate
  +-- Phase 4: Accessibility testing
  +-- Phase 5: Perf CI gate promotion

Week 5: V1.3 Auto-restart policy (if needed)
```

---

## Part 5: Test Inventory Summary

### Current State
- Rust tests: 120 pass
- Frontend tests: 162 pass
- E2E tests: 20 pass (2 skipped)
- Stress tests: 3 pass
- Perf tests: baseline PASS

### Target State (after V2 test plan)
- Rust tests: 120+ pass (no regression)
- Frontend tests: 200+ pass (+40 component tests)
- E2E tests: 35+ pass (0 skipped, +15 new specs)
- Stress tests: 7+ pass (+4 new scenarios)
- A11y tests: 0 critical violations
- Perf tests: blocking CI gate

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Real Tauri E2E flaky on CI | Medium | High | Use mock for unit, real for critical paths only |
| Perf gate noise blocks CI | Medium | Medium | Median-of-3 + warmup |
| A11y fixes scope creep | Low | Medium | Target critical/serious only for V2 |
| V2 component tests require refactoring | Low | Low | Components already well-structured |
