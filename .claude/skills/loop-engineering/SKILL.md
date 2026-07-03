# Loop Engineering Skill

Reusable pattern for implementing features with quality gates. Works with all AI code agents.

## Pattern

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

## Usage

### As Slash Command

```
/loop-engineering <feature description>
```

### With /orchestrate

```bash
/orchestrate custom "tdd-guide,typescript-reviewer,e2e-runner" "[Task] <description>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <criteria>"
```

### With Custom Agents

```bash
/orchestrate custom "your-agent-1,your-agent-2" "[Task] <description>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <criteria>"
```

## Agent Combinations

| Use Case | Chain |
|----------|-------|
| Frontend feature | `tdd-guide,typescript-reviewer,e2e-runner` |
| Backend feature | `tdd-guide,rust-reviewer,e2e-runner` |
| Fullstack feature | `tdd-guide,rust-reviewer,typescript-reviewer,e2e-runner` |
| CI/CD fix | `build-error-resolver` |
| Documentation | `doc-updater` |
| Security audit | `security-reviewer,typescript-reviewer` |

## Quality Gate Checklist

Before marking a feature complete:

- [ ] Unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Typecheck clean (`npm run typecheck`)
- [ ] Lint clean (`npm run lint`)
- [ ] No `test.skip()` in test files
- [ ] No `TODO`/`FIXME` in implemented code
- [ ] Code review findings addressed

## Examples

### Example 1: Frontend Feature

```bash
/orchestrate custom "tdd-guide,typescript-reviewer,e2e-runner" "[Task] Add dark mode toggle to settings; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: toggle switches theme, persists to localStorage, all tests pass"
```

### Example 2: Backend Feature

```bash
/orchestrate custom "tdd-guide,rust-reviewer,e2e-runner" "[Task] Add file watcher for workspace directory; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: watcher detects file changes, emits events, no memory leaks, all tests pass"
```

### Example 3: Fullstack Feature

```bash
/orchestrate custom "tdd-guide,rust-reviewer,typescript-reviewer,e2e-runner" "[Task] Implement user authentication with JWT; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: login/logout works, tokens persist, protected routes redirect, all tests pass"
```

## Integration with Existing Skills

- `/brainstorming` — design phase (before loop engineering)
- `/plan-orchestrate` — plan decomposition (before loop engineering)
- `/loop-engineering` — implementation phase (after planning)

## Tips

1. **Start small** — implement one feature at a time
2. **Test first** — write tests before implementation
3. **Fix immediately** — don't accumulate test failures
4. **Review honestly** — address all review findings
5. **Quality gate** — never skip typecheck/lint/test
