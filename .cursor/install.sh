#!/usr/bin/env bash
#
# Idempotent Cloud Agent bootstrap for the Kibi monorepo. Runs from /workspace
# after the source is checked out (and whenever dependencies are refreshed).
#
# Installs the two toolchain prerequisites that are not part of the default base
# image -- SWI-Prolog (the KB reasoning engine, >= 9) and a pinned Bun -- and
# then installs workspace dependencies. Keep this terminating and re-runnable:
# no dev servers, migrations, or test runs belong here.
set -euo pipefail

BUN_VERSION="1.3.10"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

# 1. SWI-Prolog (>= 9) from the official stable PPA, matching CI. bubblewrap is
#    used by the strict-proof sandbox. Skipped when already present.
if ! command -v swipl >/dev/null 2>&1; then
  echo "==> installing SWI-Prolog"
  export DEBIAN_FRONTEND=noninteractive
  ${SUDO} apt-get update
  ${SUDO} apt-get install -y --no-install-recommends software-properties-common
  ${SUDO} add-apt-repository -y ppa:swi-prolog/stable
  ${SUDO} apt-get update
  ${SUDO} apt-get install -y --no-install-recommends swi-prolog bubblewrap
fi

# 2. Bun, pinned to the version CI uses. Symlinked into a PATH directory so it
#    resolves from non-login shells as well. Skipped when already present.
if ! command -v bun >/dev/null 2>&1; then
  echo "==> installing Bun ${BUN_VERSION}"
  export BUN_INSTALL="${HOME}/.bun"
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
  if [ -n "${SUDO}" ] || [ -w /usr/local/bin ]; then
    ${SUDO} ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bun
    ${SUDO} ln -sf "${BUN_INSTALL}/bin/bunx" /usr/local/bin/bunx
  fi
fi
export PATH="${HOME}/.bun/bin:${PATH}"

# 3. Workspace dependencies (idempotent; a no-op when already satisfied).
echo "==> bun install (workspace)"
bun install --frozen-lockfile

# Mirror CI: resolve the .opencode workspace when it declares its own manifest.
if [ -f .opencode/package.json ] || [ -f .opencode/bun.lock ] || [ -f .opencode/bun.lockb ]; then
  echo "==> bun install (.opencode)"
  (cd .opencode && bun install --frozen-lockfile)
fi

echo "==> toolchain versions"
swipl --version
bun --version
node --version
