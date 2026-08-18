---
id: REQ-mcp-relationship-preflight
title: MCP relationship preflight rejects invalid relationship targets
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/requirements/REQ-mcp-relationship-preflight.md
priority: high
tags:
  - mcp
  - relationships
  - validation
links:
  - type: specified_by
    target: SCEN-mcp-relationship-preflight
  - type: verified_by
    target: TEST-mcp-relationship-preflight
type: req
---

MCP relationship validation must reject malformed tuples, invalid targets, and source mismatches with actionable diagnostics before a mutation is persisted.
