#!/usr/bin/env bash
# Copy the built plugin into Cursor user-plugins folders for full plugin-UI testing.
# Repo dogfood does not require this; use scripts/sync-cursor-dogfood.sh instead.
#
# WSL workspaces use ~/.cursor/plugins/local (Linux home), not the Windows profile.
# Symlinks are rejected; always copy a real directory tree.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bun run build:cursor

install_copy() {
  local target="$1"
  mkdir -p "$(dirname "$target")"
  rm -rf "$target"
  cp -r packages/cursor "$target"
  echo "Copied kibi-cursor plugin to ${target}"
}

# WSL / Remote-WSL: Cursor reads Linux home plugins path for unifiedAgent workspaces.
install_copy "${HOME}/.cursor/plugins/local/kibi-cursor"

# Native Windows profile is ignored for WSL workspaces. Opt in only for native Windows testing.
if [[ "${SYNC_CURSOR_PLUGIN_WINDOWS:-}" == "1" && -d /mnt/c/Users ]]; then
  windows_user="${CURSOR_WINDOWS_USER:-pfran}"
  install_copy "/mnt/c/Users/${windows_user}/.cursor/plugins/local/kibi-cursor"
fi

echo "Reload Cursor (Developer: Reload Window), then check Plugins -> User for kibi-cursor."
