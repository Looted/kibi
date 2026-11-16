---
title: An MCP host loads one-line field descriptions and reads the full text through kb_skills
status: active
priority: must
expects: success
tags:
  - mcp
  - skills
origin:
  kind: agent
  recorded_at: '2026-11-16T06:40:13.832Z'
id: SCEN-mcp-short-field-descriptions
type: scenario
---
Given a running Kibi MCP server, when a host lists its tools, then every input field description in every advertised schema is at most 120 characters. When the agent needs a field's full description, it reads resources/operation-fields.md of the kibi-usage skill through kb_skills and finds the field listed under its operation with the full text.