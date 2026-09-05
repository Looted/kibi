---
id: REQ-mcp-tool-upsert
title: 'MCP Tool: Create or update entities and relationships'
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/mcp/src/tools/upsert.ts
priority: must
owner: mcp-team
tags:
  - mcp
  - kibi
  - mutation
links:
  - type: specified_by
    target: SCEN-mcp-tool-upsert
  - type: verified_by
    target: TEST-mcp-upsert-coverage
semantic_text: The `kb_upsert` MCP tool must:\n\nAllow agents to create or update a single entity with its metadata.\nSupport batch creation of relationships to other existing entities in the same call.\nValidate relationship types against the supported canonical list.\nEnforce requirement consistency by rejecting writes that contradict existing requirements, unless a `supersedes` relationship is provided.\nTrigger a refresh of symbol coordinates if the upsert affects symbol linkage.
logic_claims:
  - CLAIM-8A6BF5268C7491AB
semantic_clauses:
  - The `kb_upsert` MCP tool must:\n\nAllow agents to create or update a single entity with its metadata.\nSupport batch creation of relationships to other existing entities in the same call.\nValidate relationship types against the supported canonical list.\nEnforce requirement consistency by rejecting writes that contradict existing requirements, unless a `supersedes` relationship is provided.\nTrigger a refresh of symbol coordinates if the upsert affects symbol linkage
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fa3cacb05e967c06321bf9117e80e79563cfd8316961f83cc58ecc25cf2f446c
semantic_inventory:
  - claim_key: CLAIM-8A6BF5268C7491AB
    claim_text: The `kb_upsert` MCP tool must:\n\nAllow agents to create or update a single entity with its metadata.\nSupport batch creation of relationships to other existing entities in the same call.\nValidate relationship types against the supported canonical list.\nEnforce requirement consistency by rejecting writes that contradict existing requirements, unless a `supersedes` relationship is provided.\nTrigger a refresh of symbol coordinates if the upsert affects symbol linkage
    role: exception
    status: modeled
    span:
      start: 0
      end: 472
type: req
---

The `kb_upsert` MCP tool must:

1. Allow agents to create or update a single entity with its metadata.
2. Support batch creation of relationships to other existing entities in the same call.
3. Validate relationship types against the supported canonical list.
4. Enforce requirement consistency by rejecting writes that contradict existing requirements, unless a `supersedes` relationship is provided.
5. Trigger a refresh of symbol coordinates if the upsert affects symbol linkage.
