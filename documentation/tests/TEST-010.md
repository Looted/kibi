---
id: TEST-010
title: Non-core inference tools are not advertised through the public MCP surface
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-04-24T08:12:00Z
priority: must
tags:
  - mcp
  - inference
  - integration
links:
  - type: validates
    target: SCEN-008
---

Validation steps:
1. Start `kibi-mcp` and call `tools/list`.
2. Verify only `kb_query`, `kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`, `kb_upsert`, `kb_delete`, `kb_check`, `kb_autopilot_generate`, and `kb_briefing_generate` are advertised (11 tools total).
3. Attempt `tools/call` for a removed non-core inference tool name.
4. Verify the call is rejected with an unknown-tool style error.
