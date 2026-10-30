---
title: A progress report not forwarded as a notification for a progress token fails the MCP progress guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:36.894Z'
id: SCEN-CASE-bootstrap-apply-long-running-PROGRESS-NOT-NOTIFIED
type: scenario
---
Given a kb_apply_plan request over MCP that carries the progress token apply-1 and a plan whose apply reports four progress rows, when the server handles it, then the client receives four notifications/progress messages with progress 0 to 3, the token apply-1 and total 3, and a report that is not forwarded fails the guard.

This covers the value past the bound, `gt 0`, of the claim that every progress report is sent as a notification when a token is present. packages/mcp/tests/server/kb-apply-plan-progress.test.ts "forwards per-action progress as notifications/progress for a progressToken" exercises it.
