---
title: Scenario for REQ-vibe-mcp-launcher-contract
status: active
tags:
  - vibe
origin:
  kind: agent
  recorded_at: '2026-11-19T20:15:52.342Z'
id: SCEN-vibe-mcp-launcher-contract
type: scenario
---
Given a workspace with .kb/manifest.json, when the launcher answers initialize and tools/list, then the full kb_* tool list (the MCP package's tools-list contract fixture) is listed. Given a directory without .kb/manifest.json, when the launcher answers initialize and tools/list, then tools is empty and the process exits 0 when stdin closes. Given a non-Kibi cwd, when bin/kibi.mjs runs a route, then it exits 3 without spawning.