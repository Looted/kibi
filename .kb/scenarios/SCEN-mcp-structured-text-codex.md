---
title: Codex gets the discovery summary alone; Cursor and Gemini CLI keep the data copy
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: SCEN-mcp-structured-text-codex
type: scenario
---
Given a discovery tool result, when the host is Codex (KIBI_MCP_HOST=codex or the client name codex-mcp-client), then the text part is the summary alone; when the host is Cursor or Gemini CLI, the text part carries the data JSON before the summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise.