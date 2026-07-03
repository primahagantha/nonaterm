# Loop Engineering — Orchestrate Template

Copy-paste ready template for `/orchestrate` with loop engineering pattern.

## Template

```bash
/orchestrate custom "<agent-chain>" "[Task] <description>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <criteria>"
```

## Pre-filled Examples

### Frontend Feature

```bash
/orchestrate custom "tdd-guide,typescript-reviewer,e2e-runner" "[Task] <FEATURE_DESCRIPTION>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <ACCEPTANCE_CRITERIA>"
```

### Backend Feature

```bash
/orchestrate custom "tdd-guide,rust-reviewer,e2e-runner" "[Task] <FEATURE_DESCRIPTION>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <ACCEPTANCE_CRITERIA>"
```

### Fullstack Feature

```bash
/orchestrate custom "tdd-guide,rust-reviewer,typescript-reviewer,e2e-runner" "[Task] <FEATURE_DESCRIPTION>; Loop: write tests → implement → fix → review → fix → quality gate clean. Acceptance: <ACCEPTANCE_CRITERIA>"
```

### CI/CD Fix

```bash
/orchestrate custom "build-error-resolver" "[Task] <ISSUE_DESCRIPTION>; Acceptance: <ACCEPTANCE_CRITERIA>"
```

### Documentation

```bash
/orchestrate custom "doc-updater" "[Task] <DOC_DESCRIPTION>; Acceptance: <ACCEPTANCE_CRITERIA>"
```

## Fill-in Instructions

1. Replace `<FEATURE_DESCRIPTION>` with your feature description
2. Replace `<ACCEPTANCE_CRITERIA>` with 1-3 verifiable acceptance criteria
3. Choose the appropriate agent chain based on your use case
4. Run the command

## Quality Gate

After each step completes, verify:
- [ ] Tests pass
- [ ] Typecheck clean
- [ ] Lint clean
- [ ] No skipped tests
- [ ] No TODO/FIXME in code
