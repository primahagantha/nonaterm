#!/usr/bin/env bash
set -euo pipefail

echo "============================"
echo " Nonaterm Build Script"
echo "============================"
echo

echo "[1/5] TypeScript type check..."
npx tsc --noEmit
echo "PASS: TypeScript clean"
echo

echo "[2/5] ESLint..."
npx eslint src/ --max-warnings=0
echo "PASS: Lint clean"
echo

echo "[3/5] Unit tests..."
npx vitest run
echo "PASS: All unit tests pass"
echo

echo "[4/5] Vite build..."
npx vite build
echo "PASS: Build successful"
echo

echo "[5/5] Tauri build (skipped - run manually: npm run tauri build)"
echo

echo "============================"
echo " ALL GATES PASSED"
echo "============================"
