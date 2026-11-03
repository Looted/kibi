#!/bin/sh
# Build command for stryker.treesitter.conf.mjs, run in each sandbox root.
# $1 is the repository root: Stryker runs this before node_modules is linked
# into the sandbox, so tsc is taken from there.
#
# The plugin's tests import its dist, so the instrumented source is compiled
# here (tsc reports type errors on instrumented code but still emits), then
# the worker pool is swapped for an in-process shim so the runner's mutant
# switching and coverage reach the readers.
set -e
sh scripts/mutation-sandbox-setup.sh
cd packages/plugin-treesitter
rm -rf dist tsconfig.tsbuildinfo
"${1:?repo root}/node_modules/.bin/tsc" -p tsconfig.json || true
cat dist/*.js | grep -q stryMutAct || { echo "instrumented build missing" >&2; exit 1; }
cd ../..
node scripts/mutation-treesitter-inprocess.mjs packages/plugin-treesitter
