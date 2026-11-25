#!/bin/sh
# Resolve a Node.js executable even when the host launches hooks or MCP
# servers with a minimal non-login PATH (common with nvm, volta, fnm, mise).
set -eu

find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  if [ -n "${NVM_BIN:-}" ] && [ -x "${NVM_BIN}/node" ]; then
    printf '%s\n' "${NVM_BIN}/node"
    return 0
  fi

  # Pick the newest nvm-installed Node binary if present.
  if [ -d "${HOME:-}/.nvm/versions/node" ]; then
    nvm_node=""
    for candidate in "${HOME}/.nvm/versions/node"/*/bin/node; do
      if [ -x "$candidate" ]; then
        nvm_node="$candidate"
      fi
    done
    if [ -n "$nvm_node" ]; then
      printf '%s\n' "$nvm_node"
      return 0
    fi
  fi

  for candidate in \
    "${HOME:-}/.volta/bin/node" \
    "${HOME:-}/.local/share/fnm/aliases/default/bin/node" \
    "${HOME:-}/.fnm/aliases/default/bin/node" \
    "${HOME:-}/.asdf/shims/node" \
    "${HOME:-}/.mise/shims/node" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node"
  do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

NODE_BIN="$(find_node || true)"
if [ -z "$NODE_BIN" ]; then
  printf '%s\n' "[kibi-antigravity] node executable not found on PATH or standard version-manager paths" >&2
  exit 127
fi

NODE_DIR="$(dirname "$NODE_BIN")"
case ":${PATH:-}:" in
  *":${NODE_DIR}:"*) ;;
  *) PATH="${NODE_DIR}:${PATH:-}" ;;
esac
if [ -d "${HOME:-}/.bun/bin" ]; then
  case ":${PATH}:" in
    *":${HOME}/.bun/bin:"*) ;;
    *) PATH="${PATH}:${HOME}/.bun/bin" ;;
  esac
fi
export PATH

exec "$NODE_BIN" "$@"
