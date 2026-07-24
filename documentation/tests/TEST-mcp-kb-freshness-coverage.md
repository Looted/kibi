---
id: TEST-mcp-kb-freshness-coverage
title: Verify MCP branch KB freshness recovery
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
priority: must
links:
  - type: validates
    target: REQ-mcp-kb-freshness
  - type: validates
    target: SCEN-mcp-kb-freshness-coverage
---

Replace the attached branch snapshot during a live MCP session and assert deterministic refresh, one retry for a changing stamp, and fail-closed behavior when reconciliation fails.
