#!/usr/bin/env bash
#
# Idempotent repository bootstrap for Cloud Agents. Runs from /workspace after
# the source is checked out. Keep this terminating and side-effect-light: no dev
# servers, migrations, or test runs belong here.
set -euo pipefail

# Ensure the pinned Bun from the base image is on PATH even in non-login shells.
export PATH="/usr/local/bun/bin:${PATH}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

echo "==> bun install (workspace)"
bun install --frozen-lockfile

# Mirror CI: resolve the .opencode workspace when it declares its own manifest.
if [ -f .opencode/package.json ] || [ -f .opencode/bun.lock ] || [ -f .opencode/bun.lockb ]; then
  echo "==> bun install (.opencode)"
  (cd .opencode && bun install --frozen-lockfile)
fi

echo "==> toolchain versions"
bun --version
node --version
swipl --version
