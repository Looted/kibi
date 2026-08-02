---
id: TEST-005
title: MCP server responds to the curated public tools with valid JSON-RPC format
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-08-02T00:00:00Z
priority: must
tags:
  - mcp
  - server
  - unit
links:
  - type: validates
    target: SCEN-001
---

Starts `kibi-mcp` in a test environment. Sends `tools/list` and asserts:
- Response has `result.tools` array with the curated public tool set
- Each tool has `name`, `description`, `inputSchema`
- Tool names are exactly `kb_query`, `kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`, `kb_upsert`, `kb_delete`, `kb_check`
- Non-interactive read tools, including `kb_status`, publish `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: false`; frozen base and diagnostic tool-list contracts preserve those annotations.
