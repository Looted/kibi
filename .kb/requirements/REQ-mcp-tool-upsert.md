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
semantic_text: The kb_upsert MCP tool must create or update a single entity with its metadata. The kb_upsert MCP tool must create relationships to other existing entities in the same call. The kb_upsert MCP tool must validate relationship types against the supported canonical list. The kb_upsert MCP tool must reject a write that contradicts an existing requirement unless the write declares a supersedes relationship. The kb_upsert MCP tool must refresh symbol coordinates when the upsert affects symbol linkage.
logic_claims:
  - CLAIM-7A41F00A73F13D45
  - CLAIM-A3EE6046DD9A175A
  - CLAIM-D92C6CE289BC614A
  - CLAIM-5AEC54A85BBFABCE
  - CLAIM-013472A6F74AE546
semantic_clauses:
  - The kb_upsert MCP tool must create or update a single entity with its metadata.
  - The kb_upsert MCP tool must create relationships to other existing entities in the same call.
  - The kb_upsert MCP tool must validate relationship types against the supported canonical list.
  - The kb_upsert MCP tool must reject a write that contradicts an existing requirement unless the write declares a supersedes relationship.
  - The kb_upsert MCP tool must refresh symbol coordinates when the upsert affects symbol linkage.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: defebdaa4259c62866b179fdcd6a60cb29c96514a13a873ababe3c321f116d68
semantic_inventory:
  - claim_key: CLAIM-7A41F00A73F13D45
    claim_text: The kb_upsert MCP tool must create or update a single entity with its metadata
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
  - claim_key: CLAIM-A3EE6046DD9A175A
    claim_text: The kb_upsert MCP tool must create relationships to other existing entities in the same call
    role: normative
    status: modeled
    span:
      start: 80
      end: 172
  - claim_key: CLAIM-D92C6CE289BC614A
    claim_text: The kb_upsert MCP tool must validate relationship types against the supported canonical list
    role: normative
    status: modeled
    span:
      start: 174
      end: 266
  - claim_key: CLAIM-5AEC54A85BBFABCE
    claim_text: The kb_upsert MCP tool must reject a write that contradicts an existing requirement unless the write declares a supersedes relationship
    role: exception
    status: modeled
    span:
      start: 268
      end: 403
  - claim_key: CLAIM-013472A6F74AE546
    claim_text: The kb_upsert MCP tool must refresh symbol coordinates when the upsert affects symbol linkage
    role: normative
    status: modeled
    span:
      start: 405
      end: 498
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
rationale: "Upsert is how agents write the KB, so it must validate relationships and refuse silent contradictions of existing requirements unless the write says what it supersedes."
---
- The kb_upsert MCP tool must create or update a single entity with its metadata.
- The kb_upsert MCP tool must create relationships to other existing entities in the same call.
- The kb_upsert MCP tool must validate relationship types against the supported canonical list.
- The kb_upsert MCP tool must reject a write that contradicts an existing requirement unless the write declares a supersedes relationship.
- The kb_upsert MCP tool must refresh symbol coordinates when the upsert affects symbol linkage.

## Rationale
Upsert is how agents write the KB, so it must validate relationships and refuse silent contradictions of existing requirements unless the write says what it supersedes.
