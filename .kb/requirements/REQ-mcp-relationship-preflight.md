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
semantic_text: MCP relationship validation must reject malformed tuples, invalid targets, and source mismatches with actionable diagnostics before a mutation is persisted.
logic_claims:
  - CLAIM-C62B5CEF66028568
semantic_clauses:
  - MCP relationship validation must reject malformed tuples, invalid targets, and source mismatches with actionable diagnostics before a mutation is persisted
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1c8ac8a39b75a0ad7fc84c5324b2f6c0845b39c8ee1acc648c2f2063f79744b6
semantic_inventory:
  - claim_key: CLAIM-C62B5CEF66028568
    claim_text: MCP relationship validation must reject malformed tuples, invalid targets, and source mismatches with actionable diagnostics before a mutation is persisted
    role: normative
    status: modeled
    span:
      start: 0
      end: 155
---

MCP relationship validation must reject malformed tuples, invalid targets, and source mismatches with actionable diagnostics before a mutation is persisted.
