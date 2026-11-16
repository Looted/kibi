---
title: A surface that opens with its own text instead of the brief is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - session-brief
  - negative-path
id: SCEN-NEG-session-brief-on-every-surface-OWN-TEXT
type: scenario
---
Given a host adapter that starts the session silently or with its own wording, and MCP instructions that do not carry the brief, when the surfaces are checked, then they are rejected because an agent on that host is not told the shared policy.