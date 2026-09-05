#!/usr/bin/env bash
#
# Idempotent Cloud Agent bootstrap for the Kibi monorepo. Runs from /workspace
# after the source is checked out (and whenever dependencies are refreshed).
#
# Installs the toolchain prerequisites that are not part of the default base
# image -- SWI-Prolog (the KB reasoning engine, >= 9), bubblewrap (the
# strict-proof sandbox), and a pinned Bun -- and then installs workspace
# dependencies. Keep this terminating and re-runnable: no dev servers,
# migrations, or test runs belong here.
set -euo pipefail

# Bun pin. Keep in sync with .github/workflows/ci.yml (bun-version).
BUN_VERSION="1.3.10"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

apt_install() {
  export DEBIAN_FRONTEND=noninteractive
  ${SUDO} apt-get update
  ${SUDO} apt-get install -y --no-install-recommends "$@"
}

# 1. SWI-Prolog (>= 9) from the official stable PPA, matching CI. Skipped when
#    already present.
if ! command -v swipl >/dev/null 2>&1; then
  echo "==> installing SWI-Prolog"
  export DEBIAN_FRONTEND=noninteractive
  ${SUDO} apt-get update
  ${SUDO} apt-get install -y --no-install-recommends software-properties-common
  ${SUDO} add-apt-repository -y ppa:swi-prolog/stable
  apt_install swi-prolog
fi

# 2. bubblewrap (binary: `bwrap`) used by the strict-proof sandbox. Ensured
#    independently of SWI-Prolog so an image that already ships swipl but not
#    bubblewrap still gets it.
if ! command -v bwrap >/dev/null 2>&1; then
  echo "==> installing bubblewrap"
  apt_install bubblewrap
fi

# 3. Bun, pinned to the version CI uses. The pin is enforced by comparing the
#    installed version to BUN_VERSION, so an older/different Bun already on PATH
#    is upgraded/reinstalled rather than skipped. Symlinked into a PATH
#    directory so it resolves from non-login shells as well.
install_bun() {
  echo "==> installing Bun ${BUN_VERSION}"
  export BUN_INSTALL="${HOME}/.bun"
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
  if [ -n "${SUDO}" ] || [ -w /usr/local/bin ]; then
    ${SUDO} ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bun
    ${SUDO} ln -sf "${BUN_INSTALL}/bin/bunx" /usr/local/bin/bunx
  fi
}

current_bun_version=""
if command -v bun >/dev/null 2>&1; then
  current_bun_version="$(bun --version 2>/dev/null || true)"
fi
if [ "${current_bun_version}" != "${BUN_VERSION}" ]; then
  install_bun
fi
# Prefer the pinned Bun (installed under ~/.bun) over any other on PATH.
export PATH="${HOME}/.bun/bin:${PATH}"

# 4. Workspace dependencies (idempotent; a no-op when already satisfied).
echo "==> bun install (workspace)"
bun install --frozen-lockfile

# Mirror CI: resolve the .opencode workspace when it declares its own manifest.
if [ -f .opencode/package.json ] || [ -f .opencode/bun.lock ] || [ -f .opencode/bun.lockb ]; then
  echo "==> bun install (.opencode)"
  (cd .opencode && bun install --frozen-lockfile)
fi

echo "==> toolchain versions"
swipl --version
bwrap --version
bun --version
node --version
