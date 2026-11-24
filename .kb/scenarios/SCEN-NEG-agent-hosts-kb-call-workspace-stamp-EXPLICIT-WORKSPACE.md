---
title: A Kibi MCP call that names a workspace keeps it
status: active
expects: rejection
tags:
  - negative-path
  - hooks
  - agent-hosts
  - mcp
  - worktree
origin:
  kind: agent
  recorded_at: '2026-11-23T17:47:33.493Z'
id: SCEN-NEG-agent-hosts-kb-call-workspace-stamp-EXPLICIT-WORKSPACE
type: scenario
---
**Given** a host hook that would replace an explicit `workspaceRoot` with the session's workspace, **when** a Kibi MCP call carries a `workspaceRoot` naming another worktree, **then** the hook returns no rewritten input, so the call keeps the workspace the agent named and the attempt to reroute it is refused.

`packages/zcode/tests/hook-runner.test.ts` "PreToolUse leaves a Kibi MCP call that names a workspace alone" and `packages/claude/tests/hook-runner.test.ts` of the same name exercise it.
