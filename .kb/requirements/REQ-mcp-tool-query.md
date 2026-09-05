---
id: REQ-mcp-tool-query
title: 'MCP Tool: Execute filtered entity queries'
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/mcp/src/tools/query.ts
priority: must
owner: mcp-team
tags:
  - mcp
  - kibi
  - query
links:
  - type: specified_by
    target: SCEN-mcp-tool-query
  - type: verified_by
    target: TEST-012
semantic_text: The `kb_query` MCP tool must:\n\nAllow agents to retrieve entities from the knowledge base using structured filters (id, type, sourceFile, tags).\nSupport pagination via `limit` and `offset` parameters.\nReturn entities in a structured format suitable for model consumption.\nCorrectly handle missing entities by returning an empty result or appropriate error message.
logic_claims:
  - CLAIM-957B0DABB388428A
semantic_clauses:
  - The `kb_query` MCP tool must:\n\nAllow agents to retrieve entities from the knowledge base using structured filters (id, type, sourceFile, tags).\nSupport pagination via `limit` and `offset` parameters.\nReturn entities in a structured format suitable for model consumption.\nCorrectly handle missing entities by returning an empty result or appropriate error message
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6631c91f82099a8d03c2a0a9660909d79ff4bc9029914d722684d5da93059235
semantic_inventory:
  - claim_key: CLAIM-957B0DABB388428A
    claim_text: The `kb_query` MCP tool must:\n\nAllow agents to retrieve entities from the knowledge base using structured filters (id, type, sourceFile, tags).\nSupport pagination via `limit` and `offset` parameters.\nReturn entities in a structured format suitable for model consumption.\nCorrectly handle missing entities by returning an empty result or appropriate error message
    role: normative
    status: modeled
    span:
      start: 0
      end: 367
type: req
---

The `kb_query` MCP tool must:

1. Allow agents to retrieve entities from the knowledge base using structured filters (id, type, sourceFile, tags).
2. Support pagination via `limit` and `offset` parameters.
3. Return entities in a structured format suitable for model consumption.
4. Correctly handle missing entities by returning an empty result or appropriate error message.
