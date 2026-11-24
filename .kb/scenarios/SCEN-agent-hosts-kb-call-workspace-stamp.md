---
title: A Kibi MCP call that names no workspace gets the session's
status: active
tags:
  - scenario
  - hooks
  - agent-hosts
  - mcp
  - worktree
origin:
  kind: agent
  recorded_at: '2026-11-23T17:47:31.776Z'
id: SCEN-agent-hosts-kb-call-workspace-stamp
type: scenario
---
**Given** a session whose workspace owns a Kibi knowledge base, **when** the agent sends a Kibi MCP call whose input carries no `workspaceRoot`, **then** the host's pre-tool hook returns the call's input with `workspaceRoot` set to the session's workspace, so kibi-mcp answers from that workspace, also after the session moves into a git worktree.

`packages/zcode/tests/hook-runner.test.ts` "PreToolUse names the session workspace on a Kibi MCP call that carries none" and `packages/claude/tests/hook-runner.test.ts` of the same name exercise it.
