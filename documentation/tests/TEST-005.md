---
id: TEST-005
title: MCP server responds to all 9 tools with valid JSON-RPC format
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - mcp
  - server
  - unit
links:
  - REQ-002
  - SCEN-001
---

Starts `kibi-mcp` in a test environment. Sends `tools/list` and asserts:
- Response has `result.tools` array with exactly 9 entries
- Each tool has `name`, `description`, `inputSchema`
- Tool names include `kb_upsert`, `kb_query`, `kb_delete`, `kb_check`,
  `kb_branch_ensure`, `kb_branch_gc`, `kb_query_relationships`,
  `kb_list_entity_types`, `kb_list_relationship_types`
