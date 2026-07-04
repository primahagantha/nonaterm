# Nonaterm Installer for Windows
# Usage: irm https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "RegenadeJester/nonaterm"
$VERSION = if ($env:NONATERM_VERSION) { $env:NONATERM_VERSION } else { "latest" }
$INSTALL_DIR = if ($env:NONATERM_INSTALL_DIR) { $env:NONATERM_INSTALL_DIR } else { "$env:LOCALAPPDATA\Nonaterm" }

function Write-Info { Write-Host "[nonaterm] $args" -ForegroundColor Blue }
function Write-Ok { Write-Host "[nonaterm] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[nonaterm] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[nonaterm] $args" -ForegroundColor Red; exit 1 }

function Get-Release {
    param($Tag)
    try {
        if ($Tag -eq "latest") {
            $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest" -UseBasicParsing
        } else {
            $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/tags/$Tag" -UseBasicParsing
        }
        return $release
    } catch {
        Write-Err "Could not fetch release. Check internet connection."
    }
}

function Find-Asset {
    param($Assets, [string]$Pattern)
    $asset = $Assets | Where-Object { $_.name -like $Pattern } | Select-Object -First 1
    if (-not $asset) { return $null }
    return $asset.browser_download_url
}

function Install-Nonaterm {
    param($Release)

    $tag = $Release.tag_name
    $assets = $Release.assets

    $msiUrl = Find-Asset $Assets "*.msi"
    $exeUrl = Find-Asset $Assets "*-setup.exe"

    Write-Info "Nonaterm $tag Installer"
    Write-Host ""

    Write-Host "Choose installation method:"
    Write-Host "  1) MSI installer (recommended, system-wide)"
    Write-Host "  2) EXE installer (user-level)"
    $choice = Read-Host "Selection (1-2)"

    switch ($choice) {
        "1" {
            if (-not $msiUrl) { Write-Err "MSI installer not found in this release." }
            Write-Info "Downloading MSI installer..."
            $msiPath = "$env:TEMP\Nonaterm.msi"
            Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
            Write-Info "Launching MSI installer..."
            Start-Process msiexec.exe -ArgumentList "/i", "`"$msiPath`"", "/passive" -Wait
            Write-Ok "MSI installation complete!"
        }
        "2" {
            if (-not $exeUrl) { Write-Err "EXE installer not found in this release." }
            Write-Info "Downloading EXE installer..."
            $exePath = "$env:TEMP\Nonaterm-setup.exe"
            Invoke-WebRequest -Uri $exeUrl -OutFile $exePath -UseBasicParsing
            Write-Info "Launching EXE installer..."
            Start-Process $exePath -Wait
            Write-Ok "EXE installation complete!"
        }
        default {
            Write-Err "Invalid selection. Choose 1 or 2."
        }
    }
}

# Main
try {
    $release = Get-Release $VERSION
    $tag = $release.tag_name
    Write-Info "Version: $tag"
    Write-Info "Platform: Windows x64"
    Write-Host ""

    Install-Nonaterm -Release $release

    Write-Host ""
    Write-Ok "Installation complete!"
    Write-Host ""
    Write-Host "Quick start:" -ForegroundColor Cyan
    Write-Host "  Start Menu -> Nonaterm"
    Write-Host ""
    Write-Host "Documentation: https://github.com/$REPO#readme" -ForegroundColor Cyan
} catch {
    Write-Err "Installation failed: $_"
}
