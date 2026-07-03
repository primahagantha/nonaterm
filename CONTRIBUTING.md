# Contributing to Nonaterm

## Branch Naming

- `feat/`
- `fix/`
- `refactor/`
- `docs/`
- `test/`
- `perf/`

## Commit Messages

Use Conventional Commits:

- `feat:`
- `fix:`
- `docs:`
- `perf:`
- `refactor:`
- `test:`
- `chore:`

## PR Rules

- One concern per PR
- Prefer diffs under 500 LOC
- Include testing notes

## Required Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run test:perf
npm run test:stress
npm run test:e2e
npm run perf:check
cargo test
cargo clippy --all-targets -- -D warnings
```

> `npm run perf:check` builds the standalone probe binary and
> compares against `perf-baseline.json`. Run
> `npm run perf:write-baseline` if you have a legitimate perf
> improvement that should become the new regression baseline.

## Style

- Rust: `rustfmt`, `clippy`, no warnings
- TypeScript: strict mode, single quotes, trailing commas
- React: functional components only

## Coverage Targets

- Rust backend: > 70%
- React/hooks/stores: > 60%
- E2E: critical flows covered
