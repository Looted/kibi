---
id: SCEN-mcp-kb-freshness-coverage
title: MCP refreshes an externally replaced branch KB snapshot
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/scenarios/SCEN-mcp-kb-freshness-coverage.md
priority: must
links:
  - type: relates_to
    target: REQ-mcp-kb-freshness
  - type: verified_by
    target: TEST-mcp-kb-freshness-coverage
---

Given an attached branch KB is replaced by an external sync, when the MCP server receives the next query or mutation, then it detects the changed stamp and refreshes the attachment before serving the operation.
