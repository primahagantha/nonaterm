#!/usr/bin/env pwsh
# Sign the latest tauri bundle for an updater release.
#
# Required environment:
#   TAURI_SIGNING_PRIVATE_KEY       — full private key contents (or use *_PATH below)
#   TAURI_SIGNING_PRIVATE_KEY_PATH  — alternative: path to a .key file
#   TAURI_SIGNING_PRIVATE_KEY_PASSWORD — password for the private key
#   NONATERM_BUNDLE_DIR             — directory containing the bundles (default: src-tauri/target/release/bundle)
#
# Usage:
#   pwsh scripts/sign-release.ps1
#   pwsh scripts/sign-release.ps1 -BundleDir ./release -OutputDir ./release/signed

[CmdletBinding()]
param(
    [string]$BundleDir = "src-tauri/target/release/bundle",
    [string]$OutputDir = "src-tauri/target/release/bundle",
    [string]$Endpoint = "https://github.com/nonaterm/nonaterm/releases/latest/download/latest.json"
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx not found in PATH. Install Node.js first."
    exit 1
}

if (-not (Test-Path $BundleDir)) {
    Write-Error "Bundle directory not found: $BundleDir"
    exit 1
}

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
    Write-Error "Set TAURI_SIGNING_PRIVATE_KEY (or _PATH) before running this script."
    exit 1
}

$bundles = Get-ChildItem -Path $BundleDir -Recurse -Include *.msi,*.nsis,*.deb,*.rpm,*.app,*.appimage,*.dmg -ErrorAction SilentlyContinue
if (-not $bundles) {
    Write-Error "No bundles found under $BundleDir"
    exit 1
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$manifestPath = Join-Path $OutputDir "latest.json"
if (Test-Path $manifestPath) {
    Remove-Item $manifestPath
}

foreach ($bundle in $bundles) {
    $signaturePath = "$($bundle.FullName).sig"
    Write-Host "Signing $($bundle.Name) ..."
    npx tauri signer sign --output "$signaturePath" $bundle.FullName
}

# Build the update manifest
$envMap = @{
    TAURI_SIGNING_PRIVATE_KEY        = $env:TAURI_SIGNING_PRIVATE_KEY
    TAURI_SIGNING_PRIVATE_KEY_PATH   = $env:TAURI_SIGNING_PRIVATE_KEY_PATH
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
}
foreach ($pair in $envMap.GetEnumerator()) {
    if ($pair.Value) {
        Set-Item -Path "Env:$($pair.Key)" -Value $pair.Value
    }
}

Write-Host "Generating update manifest at $manifestPath ..."
npx tauri signer sign --output $manifestPath (Get-ChildItem $bundles | Select-Object -First 1).FullName
Write-Host "Done. Manifest:"
Get-Content $manifestPath
