# Design Spec: New Features (Quick Launch Custom + Add Pane + Loop Skill + Custom AI)

**Date**: 2026-07-03
**Status**: Approved
**Features**: 4

---

## 1. Quick Launch Custom Tool Presets

### Overview
User bisa tambah tool custom dengan nama, command, icon (2 huruf), dan warna. Disimpan di settings. Quick Launch modal punya scroll jika banyak tools.

### Data Model
```typescript
type CustomToolPreset = {
  id: string;          // UUID
  name: string;        // "My Agent"
  command: string;     // "my-agent --flag"
  icon: string;        // "MA" (max 2 chars)
  color: string;       // "#3b82f6"
  description?: string;
};
```

### UI Spec
- Tombol "+ Add custom tool" di Quick Launch modal (bawah list)
- Form modal: name, command, icon (max 2 chars input), color picker
- List custom tools dengan edit/delete buttons
- Scrollable list jika > 6 tools
- Custom tools muncul SEBELUM built-in presets

### Files
- `src/stores/settingsStore.ts` — `customTools: CustomToolPreset[]` + `addCustomTool` / `removeCustomTool` / `updateCustomTool`
- `src/components/modals/FastLaunchModal.tsx` — render custom tools + add button
- `src/components/modals/ToolPresetCard.tsx` — support edit/delete mode
- `src/components/modals/CustomToolForm.tsx` — new form component

### Acceptance
- User bisa tambah custom tool dengan nama, command, icon, warna
- Custom tools muncul di Quick Launch modal
- User bisa edit/delete custom tools
- List scroll jika banyak tools
- Custom tools persist ke localStorage

---

## 2. Add Pane "Open App"

### Overview
Tombol "Open App" di pane header yang membuka modal Quick Launch untuk pilih app. App yang dipilih jadi startup command untuk pane tersebut.

### UI Spec
- Tombol `📱` di pane header (sebelah restart/close)
- Klik → buka FastLaunchModal (reuse existing)
- Modal punya mode "Add to Pane" (bukan create workspace)
- App yang dipilih → update pane startup command
- Label: "Open App" dengan tooltip

### Data Flow
```
Click "Open App" button
  → open FastLaunchModal in "pane mode"
  → user select tool
  → updatePane(paneId, { startupCommand: tool.command })
  → terminal restarts with new command
```

### Files
- `src/components/terminal/TerminalPanePlaceholder.tsx` — add "Open App" button
- `src/components/modals/FastLaunchModal.tsx` — support "pane mode" prop
- `src/stores/workspaceStore.ts` — updatePane already exists

### Acceptance
- Tombol "Open App" visible di pane header
- Klik membuka Quick Launch modal
- Select tool → update pane startup command
- Terminal restarts dengan command baru

---

## 3. Loop Engineering Skill

### Overview
Skill slash command `/loop-engineering` yang mengotomasi pattern: write tests → implement → fix → review → quality gate. Support semua AI code agents.

### Skill Structure
```
.claude/skills/loop-engineering/
├── SKILL.md           # Skill definition
└── templates/
    └── orchestrate.md # Template for /orchestrate
```

### Pattern
```
Loop Engineering:
1. Write unit tests (TDD) — describe expected behavior
2. Implement feature — make tests pass
3. Run unit tests → fix until all pass
4. Write E2E tests — critical user flows
5. Run E2E tests → fix until all pass
6. Code review — security, performance, accessibility
7. Fix review findings
8. Quality gate: typecheck + lint + test clean
9. DONE → move to next feature
```

### Agent Support
- `tdd-guide` — write tests
- `typescript-reviewer` / `rust-reviewer` — code review
- `e2e-runner` — E2E test validation
- `build-error-resolver` — CI/CD issues
- Custom agents — user can add their own

### Orchestrate Template
```bash
/orchestrate custom "tdd-guide,typescript-reviewer,e2e-runner" "[Task] <description>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <criteria>"
```

### Files
- `.claude/skills/loop-engineering/SKILL.md` — skill definition
- `.claude/skills/loop-engineering/templates/orchestrate.md` — template

### Acceptance
- `/loop-engineering` command works
- Pattern is clear and reusable
- Support multiple agent combinations
- Template can be used with `/orchestrate`

---

## 4. Custom AI Integration (Multi-Provider)

### Overview
Support multiple AI providers (OpenAI, Anthropic, Google, local). User pilih provider + input API key + select model. Integrated dengan fitur yang sudah ada (token meter, attention inbox).

### Data Model
```typescript
type AIProvider = {
  id: string;          // "openai" | "anthropic" | "google" | "local"
  name: string;        // "OpenAI"
  apiKey: string;      // Encrypted in storage
  model: string;       // "gpt-4o"
  baseUrl?: string;    // For local/custom endpoints
  enabled: boolean;
};

type AIConfig = {
  providers: AIProvider[];
  activeProviderId: string | null;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
};
```

### UI Spec
- Settings > AI tab (new section)
- List providers dengan enable/disable toggle
- Input API key (masked, show/hide toggle)
- Model selection dropdown (predefined + custom)
- Custom base URL input for local models
- System prompt textarea
- Max tokens + temperature sliders

### Integration Points
- **Token Meter**: Parse AI response untuk hitung token usage
- **Attention Inbox**: Detect AI agent errors/exits
- **Snippet Panel**: AI bisa suggest commands
- **Command Palette**: AI commands (explain error, suggest fix)

### Files
- `src/stores/aiStore.ts` — new store for AI config
- `src/lib/aiClient.ts` — multi-provider client (OpenAI SDK compatible)
- `src/components/shell/AISettingsPanel.tsx` — settings UI
- `src/components/shell/AIAssistant.tsx` — floating AI panel
- `src-tauri/src/ai/` — backend AI module (optional, for encryption)

### Acceptance
- User bisa add multiple AI providers
- API key encrypted di storage
- Model selection per provider
- Custom base URL for local models
- Integrated dengan token meter dan attention inbox
- AI bisa explain errors dan suggest fixes

---

## Implementation Order

1. Quick Launch Custom Tool Presets (standalone, no dependencies)
2. Add Pane "Open App" (depends on #1 for custom tools)
3. Loop Engineering Skill (standalone, no code dependencies)
4. Custom AI Integration (standalone, but integrates with existing features)

## Testing Strategy

Setiap fitur mengikuti loop engineering pattern:
1. Write unit tests first (TDD)
2. Implement feature
3. Run unit tests → fix until pass
4. Write E2E tests
5. Run E2E tests → fix until pass
6. Code review
7. Fix review findings
8. Quality gate: typecheck + lint + test clean
9. Move to next feature
