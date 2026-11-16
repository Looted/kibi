---
title: Every host adapter, the MCP initialize instructions and kb_status carry the shared brief
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - session-brief
id: SCEN-session-brief-on-every-surface
type: scenario
---
Given a Kibi workspace, when a session starts in Claude Code, Codex, Cursor, OpenCode or ZCode, or an MCP client initializes the server or calls kb_status, then each one carries the same session brief from kibi-agent-core, with host lines after it.