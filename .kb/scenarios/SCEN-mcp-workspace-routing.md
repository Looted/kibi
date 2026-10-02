---
title: A worktree session's Kibi tools answer from the worktree in any harness
status: active
priority: must
tags:
  - mcp
  - worktree
  - routing
id: SCEN-mcp-workspace-routing
type: scenario
---
## Given
A Kibi MCP server attached to one checkout, while the agent works in a git worktree of the same repository (any harness; hooks optional).

## When
The agent calls a Kibi tool with `workspaceRoot` naming the worktree, or from a client whose MCP roots name it.

## Then
- The call is answered by a kibi-mcp serving that worktree (its branch, its knowledge base); the `workspaceRoot` argument never reaches the tool handler.
- The child is pooled and reused; two agents in different worktrees sharing one connection each get their own workspace; an async kb_check job is polled in the child that started it.
- A workspace outside the boundary, a directory no Kibi workspace owns, or a child that cannot start is answered from the attached workspace with a `workspace_mismatch` diagnostic naming the reason.
- With KIBI_WORKSPACE set the server never routes; a routed child never routes further.
