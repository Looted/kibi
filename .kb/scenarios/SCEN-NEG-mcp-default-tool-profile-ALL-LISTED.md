---
title: A server that lists every tool by default, hides bootstrap on an empty knowledge base, or leaves tools out of the full profile is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
  - negative-path
id: SCEN-NEG-mcp-default-tool-profile-ALL-LISTED
type: scenario
---
Given an MCP server that lists all 16 tools without the full profile, that leaves out the bootstrap tools on an empty knowledge base, or whose full profile still leaves ten tools unlisted, when its tool list is checked, then it is rejected.