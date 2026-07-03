#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [patch|minor|major]

BUMP=${1:-patch}
CURRENT=$(node -p "require('./package.json').version")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEW_VERSION}"

echo "Releasing $CURRENT -> $NEW_VERSION"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update Cargo.toml if exists
if [ -f src-tauri/Cargo.toml ]; then
  sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
fi

# Update tauri.conf.json if exists
if [ -f src-tauri/tauri.conf.json ]; then
  node -e "
  const fs = require('fs');
  const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8'));
  if (conf.version) conf.version = '$NEW_VERSION';
  if (conf.package?.version) conf.package.version = '$NEW_VERSION';
  fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
  "
fi

# Commit and tag
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json 2>/dev/null || true
git add package.json
git commit -m "release: $TAG

Bump version from $CURRENT to $NEW_VERSION.

Co-Authored-By: Claude <noreply@anthropic.com>"
git tag -a "$TAG" -m "Release $NEW_VERSION"

echo "Tagged $TAG. Push with: git push && git push --tags"
