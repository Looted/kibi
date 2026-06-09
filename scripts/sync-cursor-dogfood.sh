#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bun run build:cursor

mkdir -p .cursor/rules
rm -f .cursor/rules/kibi-workflow.mdc .cursor/rules/kibi-traceability.mdc
cp packages/cursor/rules/kibi-workflow.mdc .cursor/rules/kibi-workflow.mdc
cp packages/cursor/rules/kibi-traceability.mdc .cursor/rules/kibi-traceability.mdc

echo "Cursor dogfood synced:"
echo "  MCP:    .cursor/mcp.json -> packages/mcp/bin/kibi-mcp"
echo "  Hooks:  .cursor/hooks.json -> packages/cursor/dist/hook-runner.js"
echo "  Rules:  .cursor/rules/*.mdc"
