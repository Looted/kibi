---
title: Every host's Kibi tools answer from the session's current workspace
status: active
priority: must
tags:
  - mcp
  - worktree
  - codex
  - cursor
  - zcode
id: SCEN-mcp-launchers-follow-session-workspace
type: scenario
---
## Given
A Codex, Cursor, or ZCode session whose Kibi MCP launcher started in one Kibi checkout, while the client's MCP roots name another (for example a git worktree).

## When
The agent calls a Kibi tool.

## Then
- The launcher answers from the workspace the roots name, and identifies its host (codex, cursor, zcode) to kibi-mcp.
- With KIBI_WORKSPACE set, the launcher never asks for roots and keeps the pinned workspace.
- Every launcher, Claude's included, carries the canonical kibi-session-proxy block unchanged, and the Codex MCP config inlines the current launcher.
