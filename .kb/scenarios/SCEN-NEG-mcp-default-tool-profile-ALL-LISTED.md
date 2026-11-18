---
title: A server that leaves tools out without the core profile, lists every tool under core, or hides bootstrap on an empty knowledge base is rejected
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
Given an MCP server that leaves ten tools unlisted without the core profile, whose core profile lists every tool, or whose core profile leaves out the bootstrap tools on an empty knowledge base, when its tool list is checked, then it is rejected.