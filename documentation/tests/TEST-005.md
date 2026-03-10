---
id: TEST-005
title: MCP server responds to the 4 public tools with valid JSON-RPC format
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
- Response has `result.tools` array with exactly 4 entries
- Each tool has `name`, `description`, `inputSchema`
- Tool names are exactly `kb_upsert`, `kb_query`, `kb_delete`, `kb_check`
