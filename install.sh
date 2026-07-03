#!/usr/bin/env bash
# Nonaterm Installer for Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/regenadejester/nonaterm/main/install.sh | bash

set -euo pipefail

REPO="regenadejester/nonaterm"  # Update this with actual GitHub repo
VERSION="${NONATERM_VERSION:-latest}"
INSTALL_DIR="${NONATERM_INSTALL_DIR:-$HOME/.local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[nonaterm]${NC} $1"; }
success() { echo -e "${GREEN}[nonaterm]${NC} $1"; }
warn() { echo -e "${YELLOW}[nonaterm]${NC} $1"; }
error() { echo -e "${RED}[nonaterm]${NC} $1" >&2; exit 1; }

# Detect platform
detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Linux*)   os="linux" ;;
    Darwin*)  os="macos" ;;
    *)        error "Unsupported OS: $os. Use Windows installer for Windows." ;;
  esac

  case "$arch" in
    x86_64|amd64)  arch="x64" ;;
    aarch64|arm64) arch="aarch64" ;;
    *)             error "Unsupported architecture: $arch" ;;
  esac

  echo "${os}-${arch}"
}

# Check dependencies
check_deps() {
  for cmd in curl tar; do
    if ! command -v "$cmd" &>/dev/null; then
      error "$cmd is required but not installed."
    fi
  done
}

# Get latest version from GitHub
get_latest_version() {
  local version
  version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | grep '"tag_name"' | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
  if [ -z "$version" ]; then
    error "Could not determine latest version. Check your internet connection."
  fi
  echo "$version"
}

# Download and install
install_nonaterm() {
  local platform="$1"
  local version="$2"
  local archive_name download_url temp_dir

  if [ "$platform" = "macos-x64" ] || [ "$platform" = "macos-aarch64" ]; then
    archive_name="Nonaterm-${version}-${platform}.app.tar.gz"
  else
    archive_name="Nonaterm-${version}-${platform}.tar.gz"
  fi

  download_url="https://github.com/${REPO}/releases/download/${version}/${archive_name}"

  info "Downloading Nonaterm ${version} for ${platform}..."
  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"' EXIT

  if ! curl -fsSL -o "${temp_dir}/${archive_name}" "$download_url"; then
    error "Download failed. URL: ${download_url}"
  fi

  info "Extracting..."
  tar -xzf "${temp_dir}/${archive_name}" -C "$temp_dir"

  # Install
  mkdir -p "$INSTALL_DIR"

  if [ "$platform" = "macos-x64" ] || [ "$platform" = "macos-aarch64" ]; then
    # macOS: install to /Applications
    local app_dir="/Applications/Nonaterm.app"
    if [ -d "$app_dir" ]; then
      info "Removing previous installation..."
      rm -rf "$app_dir"
    fi
    cp -R "${temp_dir}/Nonaterm.app" "$app_dir"
    success "Installed to ${app_dir}"
    info "Launch with: open /Applications/Nonaterm.app"
  else
    # Linux: install binary
    cp "${temp_dir}/nonaterm" "${INSTALL_DIR}/nonaterm"
    chmod +x "${INSTALL_DIR}/nonaterm"
    success "Installed to ${INSTALL_DIR}/nonaterm"

    # Add to PATH if not already there
    if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
      warn "Add ${INSTALL_DIR} to your PATH:"
      echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
      echo ""
      # Try to add to shell profile
      local shell_profile=""
      if [ -f "$HOME/.zshrc" ]; then
        shell_profile="$HOME/.zshrc"
      elif [ -f "$HOME/.bashrc" ]; then
        shell_profile="$HOME/.bashrc"
      elif [ -f "$HOME/.profile" ]; then
        shell_profile="$HOME/.profile"
      fi
      if [ -n "$shell_profile" ]; then
        echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$shell_profile"
        info "Added to ${shell_profile}. Restart your shell or run: source ${shell_profile}"
      fi
    fi
  fi
}

# Main
main() {
  info "Nonaterm Installer"
  echo ""

  check_deps

  local platform
  platform=$(detect_platform)
  info "Platform: ${platform}"

  local version
  if [ "$VERSION" = "latest" ]; then
    version=$(get_latest_version)
  else
    version="$VERSION"
  fi
  info "Version: ${version}"

  install_nonaterm "$platform" "$version"

  echo ""
  success "Installation complete!"
  echo ""
  echo "Quick start:"
  if [[ "$platform" == macos* ]]; then
    echo "  open /Applications/Nonaterm.app"
  else
    echo "  nonaterm"
  fi
  echo ""
  echo "Documentation: https://github.com/${REPO}#readme"
}

main "$@"
