# Release Process

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

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
| `docs` | Documentation only | patch |
| `style` | Formatting, no code change | - |
| `refactor` | Code change that neither fixes a bug nor adds a feature | patch |
| `perf` | Performance improvement | patch |
| `test` | Adding/correcting tests | - |
| `build` | Build system or external dependencies | - |
| `ci` | CI configuration | - |
| `chore` | Other changes | - |

### Breaking Changes

Add `BREAKING CHANGE:` in the footer or `!` after the type:

```
feat!: remove deprecated API

BREAKING CHANGE: The `oldMethod` has been removed. Use `newMethod` instead.
```

This triggers a **major** version bump.

## Release Steps

### 1. Determine Version Bump

```bash
# Patch: 0.1.0 -> 0.1.1 (bug fixes)
./scripts/release.sh patch

# Minor: 0.1.0 -> 0.2.0 (new features)
./scripts/release.sh minor

# Major: 0.1.0 -> 1.0.0 (breaking changes)
./scripts/release.sh major
```

### 2. Push Tag

```bash
git push && git push --tags
```

### 3. CI Does the Rest

Pushing a `v*` tag triggers the Build & Release workflow which:
- Runs lint + unit tests
- Builds for Windows, macOS (Intel + ARM), Linux
- Creates a draft GitHub Release with all artifacts

### 4. Publish Release

Go to GitHub Releases, review the draft, and publish.

## Manual Release (Windows)

```bat
scripts\release.bat patch
git push && git push --tags
```

## Version Files

These files are updated automatically by the release script:
- `package.json` — `version` field
- `src-tauri/Cargo.toml` — `version` field
- `src-tauri/tauri.conf.json` — `version` field
