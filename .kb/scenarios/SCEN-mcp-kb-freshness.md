---
id: SCEN-mcp-kb-freshness
title: MCP refreshes an externally replaced same-branch KB snapshot
type: scenario
status: active
created_at: 2026-07-20T00:00:00Z
updated_at: 2026-07-20T00:00:00Z
source: documentation/scenarios/SCEN-mcp-kb-freshness.md
priority: must
tags: [mcp, branch, freshness]
links:
  - type: verified_by
    target: TEST-mcp-kb-freshness
---

## Scenario: Same-branch KB replacement

**Given** an MCP session is attached to the current branch KB
**When** an external sync replaces that branch snapshot while the session remains running
**Then** the next query or mutation detects the changed filesystem stamp and refreshes the attachment before serving the request
**And** an unrecoverable refresh failure returns a structured `KbRefreshError`.
