---
id: FACT-POL-027
title: Repository dogfoods local kibi-mcp, kibi-opencode, and kibi-cursor builds
status: active
created_at: 2026-03-20T00:00:00Z
updated_at: 2026-06-09T00:00:00Z
source: documentation/facts/FACT-POL-027.md
tags:
  - dogfood
  - opencode
  - cursor
  - release
  - build
  - npm
links:
  - ADR-013
  - ADR-014
  - FACT-034
fact_kind: meta
---

The repository's own OpenCode and Cursor setups do not consume the published `kibi-mcp`, `kibi-opencode`, or `kibi-cursor` packages.

- `opencode.json` starts the local MCP server through a shell wrapper that resolves the repository root with `git rev-parse --show-toplevel` before running `packages/mcp/bin/kibi-mcp --diagnostic-mode`
- `opencode.json` keeps `"plugin": []` so OpenCode does not auto-install the published `kibi-opencode` package
- `.opencode/plugins/kibi.ts` re-exports `../../packages/opencode/dist/index.js`
- `.cursor/mcp.json` uses the same repo-root MCP wrapper for Cursor dogfood
- `.cursor/hooks.json` runs `packages/cursor/dist/hook-runner.js` for advisory editor hooks
- `scripts/sync-cursor-dogfood.sh` copies plugin rules into `.cursor/rules/` after `bun run build:cursor`
- `.cursor-plugin/marketplace.json` exposes `kibi-cursor` from `plugins/kibi-cursor` (symlink to `packages/cursor`) for workspace marketplace installs
- `scripts/sync-cursor-plugin-local.sh` copies a real `kibi-cursor` directory into `~/.cursor/plugins/local` for full Plugins UI testing; symlinks are rejected when the target is outside `plugins/local` (common on WSL, where Cursor reads the Linux home path rather than the Windows profile)

Root `devDependencies` include `kibi-mcp: workspace:*` so the installed plugin's `npx --no-install kibi-mcp` MCP entry resolves in this monorepo. External projects must install `kibi-mcp` themselves.

Because these hosts use local build artifacts, contributors must run `bun run build` after Kibi package version bumps or local package wiring changes before relying on the dogfood setup. For Cursor rule refresh, also run `bun run sync:cursor-dogfood`. For Cursor plugin UI testing, run `bun run sync:cursor-plugin-local` and reload the window.
