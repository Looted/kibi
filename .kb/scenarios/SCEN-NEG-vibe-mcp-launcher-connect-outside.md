---
title: Outside a Kibi workspace the launcher never surfaces a connection failure
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:21.779Z'
id: SCEN-NEG-vibe-mcp-launcher-connect-outside
type: scenario
---
Given a directory without .kb/manifest.json, when a host would see 'MCP failed to connect', then the launcher is rejected instead: launch-kibi-mcp.mjs serves a silent zero-tool MCP server and exits 0 when stdin closes, and bin/kibi.mjs exits 3 before spawning any CLI route. packages/vibe/tests/launcher-contract.test.mjs covers the zero-tool handshake and the exit-3 path.