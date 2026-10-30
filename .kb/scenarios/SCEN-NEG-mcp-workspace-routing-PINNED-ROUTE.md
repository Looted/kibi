---
title: A pinned Kibi MCP server refuses to route a call that names another workspace
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:56:46.211Z'
id: SCEN-NEG-mcp-workspace-routing-PINNED-ROUTE
type: scenario
---
Given a Kibi MCP server started with KIBI_WORKSPACE set to its attached workspace, when a kb_search call arrives whose workspaceRoot argument names a different Kibi workspace, then the server does not route the call: it answers locally, strips the argument, and reports a notice with reason pinned.

This is the failure side of the pinning rule: an explicit workspace argument must not override an operator who pinned the server to one workspace. packages/mcp/tests/server/workspace-router.test.ts "a pinned server never routes and says so" exercises it.
