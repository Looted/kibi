#!/bin/sh
# Repair sandbox-only drift before the scoped mutation suites run.
#
# Stryker copies the repo into .stryker-tmp/sandbox-* but (a) cannot copy
# symlinks (EISDIR) and (b) recreates directories with default modes. The
# tracked plugins/ symlinks are excluded from the copy via ignorePatterns in
# stryker.conf.mjs and rebuilt here; repo-root .kibi must be 0700 because
# scripts/skillopt-eval/adoption-durable.ts refuses non-private adoption
# directories (the cursor build runs sync-agent-skills, which takes the
# adoption lock). Runs as Stryker's buildCommand in each sandbox root.
set -e
mkdir -p plugins
ln -sfn ../packages/cursor/agent-plugin plugins/kibi-agent-plugin
ln -sfn ../packages/cursor plugins/kibi-cursor
chmod 700 .kibi
