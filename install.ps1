# Nonaterm Installer for Windows
# Usage: irm https://raw.githubusercontent.com/regenadejester/nonaterm/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "regenadejester/nonaterm"  # Update with actual GitHub repo
$VERSION = if ($env:NONATERM_VERSION) { $env:NONATERM_VERSION } else { "latest" }
$INSTALL_DIR = if ($env:NONATERM_INSTALL_DIR) { $env:NONATERM_INSTALL_DIR } else { "$env:LOCALAPPDATA\Nonaterm" }

function Write-Info { Write-Host "[nonaterm] $args" -ForegroundColor Blue }
function Write-Ok { Write-Host "[nonaterm] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[nonaterm] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[nonaterm] $args" -ForegroundColor Red; exit 1 }

# Get latest version
function Get-LatestVersion {
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest" -UseBasicParsing
        return $release.tag_name
    } catch {
        Write-Err "Could not determine latest version. Check internet connection."
    }
}

# Download and install
function Install-Nonaterm {
    param($Version)

    $msiUrl = "https://github.com/$REPO/releases/download/$Version/Nonaterm_${Version}_x64_en-US.msi"
    $exeUrl = "https://github.com/$REPO/releases/download/$Version/Nonaterm_${Version}_x64-setup.exe"

    Write-Info "Nonaterm $Version Installer"
    Write-Host ""

    # Ask user preference
    Write-Host "Choose installation method:"
    Write-Host "  1) MSI installer (recommended, system-wide)"
    Write-Host "  2) EXE installer (user-level)"
    Write-Host "  3) Portable (no install, just download)"
    $choice = Read-Host "Selection (1-3)"

    switch ($choice) {
        "1" {
            Write-Info "Downloading MSI installer..."
            $msiPath = "$env:TEMP\Nonaterm-$Version.msi"
            Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
            Write-Info "Launching MSI installer..."
            Start-Process msiexec.exe -ArgumentList "/i", "`"$msiPath`"", "/passive" -Wait
            Write-Ok "MSI installation complete!"
        }
        "2" {
            Write-Info "Downloading EXE installer..."
            $exePath = "$env:TEMP\Nonaterm-$Version-setup.exe"
            Invoke-WebRequest -Uri $exeUrl -OutFile $exePath -UseBasicParsing
            Write-Info "Launching EXE installer..."
            Start-Process $exePath -Wait
            Write-Ok "EXE installation complete!"
        }
        "3" {
            Write-Info "Downloading portable version..."
            $zipUrl = "https://github.com/$REPO/releases/download/$Version/Nonaterm-${Version}-x64-portable.zip"
            $zipPath = "$env:TEMP\Nonaterm-portable.zip"

            try {
                Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
            } catch {
                Write-Warn "Portable ZIP not available. Downloading MSI instead..."
                $msiPath = "$env:TEMP\Nonaterm-$Version.msi"
                Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
                Start-Process msiexec.exe -ArgumentList "/i", "`"$msiPath`"", "/passive" -Wait
                Write-Ok "MSI installation complete!"
                return
            }

            if (Test-Path $INSTALL_DIR) { Remove-Item $INSTALL_DIR -Recurse -Force }
            Expand-Archive -Path $zipPath -DestinationPath $INSTALL_DIR -Force
            Write-Ok "Extracted to $INSTALL_DIR"

            # Add to PATH
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
            if ($currentPath -notlike "*$INSTALL_DIR*") {
                [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$INSTALL_DIR", "User")
                $env:PATH = "$env:PATH;$INSTALL_DIR"
                Write-Info "Added to PATH. Restart terminal to use 'nonaterm' command."
            }
        }
        default {
            Write-Err "Invalid selection. Choose 1, 2, or 3."
        }
    }
}

# Main
try {
    if ($VERSION -eq "latest") {
        $VERSION = Get-LatestVersion
    }
    Write-Info "Version: $VERSION"
    Write-Info "Platform: Windows x64"
    Write-Host ""

    Install-Nonaterm -Version $VERSION

    Write-Host ""
    Write-Ok "Installation complete!"
    Write-Host ""
    Write-Host "Quick start:" -ForegroundColor Cyan
    Write-Host "  Start Menu -> Nonaterm"
    Write-Host "  Or: nonaterm (if in PATH)"
    Write-Host ""
    Write-Host "Documentation: https://github.com/$REPO#readme" -ForegroundColor Cyan
} catch {
    Write-Err "Installation failed: $_"
}
