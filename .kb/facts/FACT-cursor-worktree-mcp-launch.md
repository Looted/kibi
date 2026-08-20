---
id: FACT-cursor-worktree-mcp-launch
title: Cursor dogfood MCP launcher falls back across linked worktrees
status: active
created_at: 2026-07-19T20:00:00Z
updated_at: 2026-07-19T20:00:00Z
source: documentation/facts/FACT-cursor-worktree-mcp-launch.md
tags:
  - cursor
  - dogfood
  - worktree
  - mcp
  - observation
links:
  - FACT-POL-027
fact_kind: observation
---

Cursor project dogfood previously started MCP only from `git rev-parse --show-toplevel`, so linked worktrees without a local `packages/mcp` build (or without `.cursor/mcp.json`) reported MCP unavailable. A hand-patched local plugin copy at `~/.cursor/plugins/local/kibi-cursor/mcp.json` also pointed at a non-existent `.opencode/bin/kibi-mcp`, which failed even outside worktrees.

Fix (2026-07-19):

- `.cursor/mcp.json` prefers the current checkout's `packages/mcp/bin/kibi-mcp` when that binary and `packages/mcp/dist` exist; otherwise it falls back to the primary checkout via `git rev-parse --path-format=absolute --git-common-dir`.
- `packages/cursor/tests/dogfood-config.test.ts` locks the launcher string and exercises the common-dir fallback from a worktree without local MCP dist.
- `scripts/sync-cursor-plugin-local.sh` restores the published plugin MCP shape (`npx --no-install kibi-mcp`); do not hand-patch it to `.opencode/bin`.
- Cursor Plugins → Customize does not require a plugin format rewrite for this fix.

Workaround remains: keep a built primary checkout, ensure worktrees that need project MCP include `.cursor/mcp.json`, and reload Cursor after syncing the local plugin.
