@echo off
setlocal

echo ============================
echo  Nonaterm Build Script
echo ============================
echo.

echo [1/5] TypeScript type check...
call npx tsc --noEmit
if %ERRORLEVEL% neq 0 (
    echo FAIL: TypeScript errors found
    exit /b 1
)
echo PASS: TypeScript clean
echo.

echo [2/5] ESLint...
call npx eslint src/ --max-warnings=0
if %ERRORLEVEL% neq 0 (
    echo FAIL: Lint errors found
    exit /b 1
)
echo PASS: Lint clean
echo.

echo [3/5] Unit tests...
call npx vitest run
if %ERRORLEVEL% neq 0 (
    echo FAIL: Unit tests failed
    exit /b 1
)
echo PASS: All unit tests pass
echo.

echo [4/5] Vite build...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo FAIL: Build failed
    exit /b 1
)
echo PASS: Build successful
echo.

echo [5/5] Tauri build (skipped - run manually: npm run tauri build)
echo.

echo ============================
echo  ALL GATES PASSED
echo ============================
endlocal
