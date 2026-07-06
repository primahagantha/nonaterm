#!/usr/bin/env bash
# Nonaterm Installer for Linux/macOS
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/RegenadeJester/nonaterm/master/install.sh | bash
#   curl ... | bash -s -- --yes            # non-interactive, auto-select best package
#   curl ... | bash -s -- --deb            # force .deb
#   curl ... | bash -s -- --rpm            # force .rpm
#   curl ... | bash -s -- --appimage       # force AppImage

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

# ── CLI flags ─────────────────────────────────────────────────────────
FORCE_FORMAT=""
AUTO_YES=false

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --deb)      FORCE_FORMAT="deb" ;;
      --rpm)      FORCE_FORMAT="rpm" ;;
      --appimage) FORCE_FORMAT="appimage" ;;
      --yes|-y)   AUTO_YES=true ;;
      --version)  VERSION="$2"; shift ;;
      -*)         error "Unknown flag: $1" ;;
    esac
    shift
  done
}

# ── Read from terminal even when piped ────────────────────────────────
ask_user() {
  local prompt="$1"
  if [ "$AUTO_YES" = true ]; then echo ""; return; fi
  if [ -t 0 ]; then
    read -rp "$prompt" REPLY
  elif [ -e /dev/tty ]; then
    read -rp "$prompt" REPLY </dev/tty
  else
    # Piped with no TTY and no --yes: auto-select
    REPLY=""
  fi
}

# ── OS detection ──────────────────────────────────────────────────────
detect_os() {
  local os
  os="$(uname -s)"
  case "$os" in
    Linux*)   echo "linux" ;;
    Darwin*)  echo "macos" ;;
    *)        error "Unsupported OS: $os. Use the PowerShell installer for Windows." ;;
  esac
}

# ── Linux distro family detection ─────────────────────────────────────
detect_distro_family() {
  if [ ! -f /etc/os-release ]; then
    echo "unknown"
    return
  fi

  # shellcheck source=/dev/null
  . /etc/os-release

  local id="${ID:-}" id_like="${ID_LIKE:-}"

  case "$id" in
    debian|ubuntu|linuxmint|pop|elementary|zorin|kali|parrot|raspbian)
      echo "debian"; return ;;
    fedora|rhel|centos|rocky|alma|nobara)
      echo "fedora"; return ;;
    arch|manjaro|endeavouros|garuda|cachyos)
      echo "arch"; return ;;
    opensuse*|sles|suse)
      echo "suse"; return ;;
    void)
      echo "void"; return ;;
    alpine)
      echo "alpine"; return ;;
  esac

  # Fallback: check ID_LIKE
  case "$id_like" in
    *debian*|*ubuntu*) echo "debian"; return ;;
    *fedora*|*rhel*)   echo "fedora"; return ;;
    *arch*)            echo "arch"; return ;;
    *suse*)            echo "suse"; return ;;
  esac

  echo "unknown"
}

# ── Dependencies ──────────────────────────────────────────────────────
check_deps() {
  for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      error "$cmd is required but not installed. Install it first:\n  Debian/Ubuntu: sudo apt install curl jq\n  Fedora: sudo dnf install curl jq\n  Arch: sudo pacman -S curl jq\n  macOS: brew install curl jq"
    fi
  done
}

# ── GitHub release ────────────────────────────────────────────────────
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

# ── macOS install ─────────────────────────────────────────────────────
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

# ── Linux: .deb ───────────────────────────────────────────────────────
install_deb() {
  local deb_url="$1" temp_dir="$2"
  info "Downloading .deb..."
  curl -fSL -o "${temp_dir}/nonaterm.deb" "$deb_url"

  if command -v dpkg &>/dev/null; then
    info "Installing with dpkg..."
    sudo dpkg -i "${temp_dir}/nonaterm.deb" || sudo apt-get install -f -y
  else
    error "dpkg not found. Use --appimage on this distro."
  fi
  success "Installed via .deb."
  echo "Launch with: nonaterm"
}

# ── Linux: .rpm ───────────────────────────────────────────────────────
install_rpm() {
  local rpm_url="$1" temp_dir="$2"
  info "Downloading .rpm..."
  curl -fSL -o "${temp_dir}/nonaterm.rpm" "$rpm_url"

  if command -v dnf &>/dev/null; then
    info "Installing with dnf..."
    sudo dnf install -y "${temp_dir}/nonaterm.rpm"
  elif command -v yum &>/dev/null; then
    info "Installing with yum..."
    sudo yum install -y "${temp_dir}/nonaterm.rpm"
  elif command -v zypper &>/dev/null; then
    info "Installing with zypper..."
    sudo zypper install -y "${temp_dir}/nonaterm.rpm"
  else
    error "No RPM installer found (dnf/yum/zypper). Use --appimage instead."
  fi
  success "Installed via .rpm."
  echo "Launch with: nonaterm"
}

# ── Linux: AppImage ───────────────────────────────────────────────────
install_appimage() {
  local appimage_url="$1" temp_dir="$2"
  local install_dir="${HOME}/.local/bin"
  mkdir -p "$install_dir"

  info "Downloading AppImage..."
  curl -fSL -o "${install_dir}/nonaterm" "$appimage_url"
  chmod +x "${install_dir}/nonaterm"

  success "Installed to ${install_dir}/nonaterm"

  # Check if ~/.local/bin is in PATH
  if ! echo "$PATH" | grep -q "$install_dir"; then
    warn "Add ${install_dir} to your PATH:"
    echo "  export PATH=\"${install_dir}:\$PATH\""
    echo ""
    echo "Add this line to your ~/.bashrc or ~/.zshrc to make it permanent."
  fi
}

# ── Linux: main ───────────────────────────────────────────────────────
install_linux() {
  local release_json="$1"

  local deb_url rpm_url appimage_url
  deb_url=$(find_asset_url "$release_json" "\\.deb$")
  rpm_url=$(find_asset_url "$release_json" "\\.rpm$")
  appimage_url=$(find_asset_url "$release_json" "\\.AppImage$")

  local distro
  distro=$(detect_distro_family)
  info "Detected distro family: ${distro}"

  # Determine package format: forced flag > auto-detect > interactive
  local format="$FORCE_FORMAT"

  if [ -z "$format" ]; then
    case "$distro" in
      debian)  format="deb" ;;
      fedora)  format="rpm" ;;
      suse)    format="rpm" ;;
      arch)    format="appimage" ;;
      *)       format="appimage" ;;
    esac

    # If auto-selected format is not available, fall back
    case "$format" in
      deb)      [ -z "$deb_url" ] && format="appimage" ;;
      rpm)      [ -z "$rpm_url" ] && format="appimage" ;;
      appimage) [ -z "$appimage_url" ] && format="" ;;
    esac
  fi

  # Interactive menu if no format resolved or user wants to choose
  if [ -z "$format" ] || { [ "$AUTO_YES" != true ] && { [ -t 0 ] || [ -e /dev/tty ]; }; }; then
    echo ""
    info "Available installation methods:"
    local idx=1
    local -A options
    if [ -n "$deb_url" ]; then
      echo "  ${idx}) .deb package (Debian/Ubuntu/Kali/Mint)"
      options[$idx]="deb"; ((idx++))
    fi
    if [ -n "$rpm_url" ]; then
      echo "  ${idx}) .rpm package (Fedora/RHEL/openSUSE)"
      options[$idx]="rpm"; ((idx++))
    fi
    if [ -n "$appimage_url" ]; then
      echo "  ${idx}) AppImage (universal, no root needed)"
      options[$idx]="appimage"; ((idx++))
    fi

    if [ $idx -eq 1 ]; then
      error "No installable packages found in this release."
    fi

    local choice
    if [ "$AUTO_YES" = true ]; then
      choice="1"
    else
      ask_user "Selection [1]: "
      choice="${REPLY:-1}"
    fi

    format="${options[$choice]:-}"
    if [ -z "$format" ]; then
      error "Invalid selection: $choice"
    fi
  fi

  local temp_dir
  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"' EXIT

  case "$format" in
    deb)
      [ -z "$deb_url" ] && error ".deb not found in this release."
      install_deb "$deb_url" "$temp_dir"
      ;;
    rpm)
      [ -z "$rpm_url" ] && error ".rpm not found in this release."
      install_rpm "$rpm_url" "$temp_dir"
      ;;
    appimage)
      [ -z "$appimage_url" ] && error "AppImage not found in this release."
      install_appimage "$appimage_url" "$temp_dir"
      ;;
    *)
      error "Unknown format: $format"
      ;;
  esac
}

# ── Main ──────────────────────────────────────────────────────────────
main() {
  parse_args "$@"

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
