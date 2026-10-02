---
title: A worktree session's Kibi tools answer from the worktree
status: active
priority: must
tags:
  - claude
  - mcp
  - worktree
id: SCEN-claude-mcp-follows-session-workspace
type: scenario
---
## Given
A Claude Code session whose Kibi MCP server was started in the main checkout, after which the session moved into a git worktree on another branch.

## When
The agent calls a Kibi tool.

## Then
- The launcher reads the session's MCP roots, finds the worktree's Kibi workspace, and starts kibi-mcp there with the client's original initialize handshake.
- The tool call is answered from the worktree's branch store, and the client is told the tool list changed.
- Later calls stay on the worktree; client messages keep their order across the switch.
- With KIBI_WORKSPACE set, roots that are not a Kibi workspace, a client without roots, or an unanswered roots query, the current workspace keeps answering.
