#!/bin/sh
# Check the committed checkout before pushing; full evidence uses proof:replay.
set -eu
cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Commit or isolate working-tree changes before the proof pre-push check." >&2
  exit 1
fi
bun packages/cli/bin/kibi check-generated --staged
exec node scripts/check-proof-baseline.mjs --semantic-only
