---
id: TEST-010
title: Non-core inference tools are not advertised through the public MCP surface
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-02-20T08:10:00.000Z
priority: must
tags:
  - mcp
  - inference
  - integration
links:
  - REQ-013
  - SCEN-008
  - ADR-008
---

Validation steps:
1. Start `kibi-mcp` and call `tools/list`.
2. Verify only `kb_query`, `kb_upsert`, `kb_delete`, and `kb_check` are advertised.
3. Attempt `tools/call` for a removed non-core inference tool name.
4. Verify the call is rejected with an unknown-tool style error.
