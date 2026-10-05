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
  - type: validates
    target: SCEN-001
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Validation steps:
- call `tools/list` and verify `kb_query_relationships` is absent
- call `tools/call` with `name: kb_query_relationships`
- verify the server rejects the call as an unknown public tool
