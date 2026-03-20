---
id: FACT-POL-027
title: Repository dogfoods local kibi-mcp and kibi-opencode builds
status: active
created_at: 2026-03-20T00:00:00Z
updated_at: 2026-03-20T00:30:00Z
source: documentation/facts/FACT-POL-027.md
tags:
  - dogfood
  - opencode
  - release
  - build
  - npm
links:
  - ADR-013
  - ADR-014
  - FACT-034
---

The repository's own OpenCode setup does not consume the published `kibi-mcp` or `kibi-opencode` packages.

- `opencode.json` starts the local MCP server through a shell wrapper that resolves the repository root with `git rev-parse --show-toplevel` before running `packages/mcp/bin/kibi-mcp --diagnostic-mode`
- `opencode.json` keeps `"plugin": []` so OpenCode does not auto-install the published `kibi-opencode` package
- `.opencode/plugins/kibi.ts` re-exports `../../packages/opencode/dist/index.js`

Because OpenCode here uses local build artifacts, contributors must run `bun run build` after Kibi package version bumps or local package wiring changes before relying on the dogfood setup.
