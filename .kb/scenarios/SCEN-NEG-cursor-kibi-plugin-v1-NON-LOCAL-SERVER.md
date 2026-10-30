---
title: The kibi-cursor launcher starts no other kibi-mcp when the workspace lacks the project-local one
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:14.955Z'
id: SCEN-NEG-cursor-kibi-plugin-v1-NON-LOCAL-SERVER
type: scenario
---
Given a Kibi workspace without an installed kibi-mcp, when the packed kibi-cursor MCP launcher resolves the server to start, then it refuses to start a registry, global or plugin-local kibi-mcp: it exits 1 without a resolution and names the npm install that would add the project-local package.

This is the failure side of the kibi-cursor launcher target: only the consumer's own kibi-mcp may serve its knowledge base. documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts "refuses to start any other kibi-mcp when the consumer workspace lacks one, with an actionable error" exercises it.
