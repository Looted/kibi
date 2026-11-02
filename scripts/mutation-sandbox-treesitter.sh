#!/bin/sh
set -e
sh scripts/mutation-sandbox-setup.sh
cd packages/plugin-treesitter
rm -rf dist tsconfig.tsbuildinfo
"${1:?repo root}/node_modules/.bin/tsc" -p tsconfig.json || true
cat dist/*.js | grep -q stryMutAct || { echo "instrumented build missing" >&2; exit 1; }
cd ../..
node scripts/mutation-treesitter-inprocess.mjs packages/plugin-treesitter
