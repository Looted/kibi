---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:03:53.237Z'
status: active
tags:
  - scenario
  - antigravity
  - hooks
title: Antigravity hooks deliver snippets, ask on firm edits, remind on stop, and restrict non-Kibi approvals
id: SCEN-antigravity-hook-lifecycle-and-scoping
type: scenario
expects: success
---
# Antigravity hook lifecycle, firm-edit ask, stop reminder, and non-Kibi permission scoping

- **Given** a conversation inside an opted-in Kibi workspace
- **When** `SessionStart`, `PreToolUse`, `PreInvocation`, `PostToolUse`, and `Stop` fire
- **Then** `SessionStart` injects the Kibi session brief via `injectSteps`, `PreToolUse` queues file knowledge snippets on first read or edit and drains them on `PreInvocation`
- **And** `PreToolUse` returns `decision: "ask"` with `forceAsk: true` before editing code that implements a firm requirement until confirmed
- **And** `Stop` returns `decision: "continue"` once when edited source files lack a subsequent impact check

- **Given** a conversation outside any Kibi workspace
- **When** `PreToolUse` fires
- **Then** read-only tools return `decision: "allow"` while mutating, shell, and MCP tools return `decision: "ask"`, and no Kibi context or state files are written
