---
title: MCP relationship validation must reject malformed tuples, invalid targets, and s
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: rejects_invalid_relationships
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_mcp_relationship_preflight.rejects_invalid_relationships.eq.true
claim_key: CLAIM-C62B5CEF66028568
claim_text: MCP relationship validation must reject malformed tuples, invalid targets, and source mismatches with actionable diagnostics before a mutation is persisted
id: FACT-PROP-REQ-MCP-RELATIONSHIP-PREFLIGHT-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
