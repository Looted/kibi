---
id: SCEN-mcp-kb-freshness-coverage
title: MCP refreshes an externally replaced branch KB snapshot
type: scenario
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
links:
  - type: relates_to
    target: REQ-mcp-kb-freshness
  - type: verified_by
    target: TEST-mcp-kb-freshness-coverage
  - type: verified_by
    target: TEST-e2e-mcp-freshness-external-replace
  - type: verified_by
    target: TEST-mcp-kb-freshness
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Given an attached branch KB is replaced by an external sync, when the MCP server receives the next query or mutation, then it detects the changed stamp and refreshes the attachment before serving the operation.
