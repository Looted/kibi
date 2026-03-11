---
id: TEST-mcp-query-relationships
title: Removed MCP relationship query tool is no longer advertised
status: active
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
priority: must
tags:
  - mcp
  - test
links:
  - REQ-002
  - REQ-vscode-traceability
---

Validation steps:
- call `tools/list` and verify `kb_query_relationships` is absent
- call `tools/call` with `name: kb_query_relationships`
- verify the server rejects the call as an unknown public tool
