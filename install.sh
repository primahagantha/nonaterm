#!/usr/bin/env bash
# Nonaterm Installer for Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash

set -euo pipefail

REPO="RegenadeJester/nonaterm"
VERSION="${NONATERM_VERSION:-latest}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[nonaterm]${NC} $1"; }
success() { echo -e "${GREEN}[nonaterm]${NC} $1"; }
warn() { echo -e "${YELLOW}[nonaterm]${NC} $1"; }
error() { echo -e "${RED}[nonaterm]${NC} $1" >&2; exit 1; }

detect_os() {
  local os
  os="$(uname -s)"
  case "$os" in
    Linux*)   echo "linux" ;;
    Darwin*)  echo "macos" ;;
    *)        error "Unsupported OS: $os. Use the PowerShell installer for Windows." ;;
  esac
}

check_deps() {
  for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      error "$cmd is required but not installed."
    fi
  done
}

get_release_json() {
  local tag="$1"
  if [ "$tag" = "latest" ]; then
    curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest"
  else
    curl -fsSL "https://api.github.com/repos/${REPO}/releases/tags/${tag}"
  fi
}

find_asset_url() {
  local json="$1" pattern="$2"
  echo "$json" | jq -r --arg p "$pattern" '.assets[] | select(.name | test($p)) | .browser_download_url' | head -1
}

install_macos() {
  local release_json="$1"
  local dmg_url
  dmg_url=$(find_asset_url "$release_json" "\\.dmg$")

  if [ -z "$dmg_url" ]; then
    error "No .dmg found in this release."
  fi

  local temp_dir dmg_path volume
  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"; hdiutil detach "$volume" 2>/dev/null || true' EXIT

  info "Downloading DMG..."
  dmg_path="${temp_dir}/Nonaterm.dmg"
  curl -fSL -o "$dmg_path" "$dmg_url"

  info "Mounting DMG..."
  volume=$(hdiutil attach "$dmg_path" -nobrowse -readonly 2>/dev/null | grep "/Volumes/" | sed 's/.*\(\/Volumes\/.*\)/\1/' | head -1)

  local app_src="${volume}/Nonaterm.app"
  local app_dst="/Applications/Nonaterm.app"

  if [ -d "$app_dst" ]; then
    info "Removing previous installation..."
    rm -rf "$app_dst"
  fi

  info "Copying to /Applications..."
  cp -R "$app_src" "$app_dst"
  hdiutil detach "$volume" 2>/dev/null || true
  trap 'rm -rf "$temp_dir"' EXIT

  success "Installed to /Applications/Nonaterm.app"
  echo ""
  echo "Launch with: open /Applications/Nonaterm.app"
}

install_linux() {
  local release_json="$1"

  local deb_url appimage_url
  deb_url=$(find_asset_url "$release_json" "\\.deb$")
  appimage_url=$(find_asset_url "$release_json" "\\.AppImage$")

  info "Choose installation method:"
  if [ -n "$deb_url" ]; then echo "  1) .deb package (Debian/Ubuntu)"; fi
  if [ -n "$appimage_url" ]; then echo "  2) AppImage (universal, no install)"; fi

  local choice
  read -rp "Selection: " choice

  local temp_dir
  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"' EXIT

  case "$choice" in
    1)
      if [ -z "$deb_url" ]; then error ".deb not found in this release."; fi
      info "Downloading .deb..."
      curl -fSL -o "${temp_dir}/nonaterm.deb" "$deb_url"
      info "Installing with dpkg..."
      sudo dpkg -i "${temp_dir}/nonaterm.deb" || sudo apt-get install -f -y
      success "Installed via dpkg."
      echo ""
      echo "Launch with: nonaterm"
      ;;
    2)
      if [ -z "$appimage_url" ]; then error "AppImage not found in this release."; fi
      info "Downloading AppImage..."
      local install_dir="${HOME}/.local/bin"
      mkdir -p "$install_dir"
      curl -fSL -o "${install_dir}/nonaterm" "$appimage_url"
      chmod +x "${install_dir}/nonaterm"
      success "Installed to ${install_dir}/nonaterm"
      if ! echo "$PATH" | grep -q "$install_dir"; then
        warn "Add ${install_dir} to your PATH:"
        echo "  export PATH=\"${install_dir}:\$PATH\""
      fi
      ;;
    *)
      error "Invalid selection."
      ;;
  esac
}

main() {
  info "Nonaterm Installer"
  echo ""

  check_deps

  local os
  os=$(detect_os)
  info "Platform: ${os}"

  local release_json tag
  release_json=$(get_release_json "$VERSION")
  tag=$(echo "$release_json" | jq -r '.tag_name')
  info "Version: ${tag}"
  echo ""

  case "$os" in
    macos) install_macos "$release_json" ;;
    linux) install_linux "$release_json" ;;
  esac

  echo ""
  success "Installation complete!"
  echo ""
  echo "Documentation: https://github.com/${REPO}#readme"
}

main "$@"
