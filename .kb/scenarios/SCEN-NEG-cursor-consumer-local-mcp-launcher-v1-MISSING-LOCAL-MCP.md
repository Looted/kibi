---
title: The Cursor launcher fails with an actionable error instead of starting a non-local kibi-mcp
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:57.471Z'
id: SCEN-NEG-cursor-consumer-local-mcp-launcher-v1-MISSING-LOCAL-MCP
type: scenario
---
Given a consumer workspace with .kb/manifest.json and a package.json but no installed kibi-mcp, when the packed kibi-cursor launcher is asked to resolve the server for it, then it refuses to fall back to any other runtime: it exits 1, prints no resolution, and tells the person to install kibi-mcp in that workspace.

This is the failure side of consumer-local resolution: a runtime from outside the consumer could serve the KB with another version. documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts "refuses to start any other kibi-mcp when the consumer workspace lacks one, with an actionable error" exercises it.
