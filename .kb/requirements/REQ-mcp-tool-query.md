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
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-mcp-tool-query
  - type: verified_by
    target: TEST-012
semantic_text: The kb_query MCP tool must retrieve entities by the structured filters id, type, sourceFile and tags. The kb_query MCP tool must page results with the limit and offset parameters. The kb_query MCP tool must return entities as structured content. The kb_query MCP tool must return an empty result, not an error, when no entity matches.
logic_claims:
  - CLAIM-BBB9965BF22DF665
  - CLAIM-AF3C0A24FFE156A1
  - CLAIM-F1952E51CF943BCB
  - CLAIM-E0AD013FC8777CE8
semantic_clauses:
  - The kb_query MCP tool must retrieve entities by the structured filters id, type, sourceFile and tags.
  - The kb_query MCP tool must page results with the limit and offset parameters.
  - The kb_query MCP tool must return entities as structured content.
  - The kb_query MCP tool must return an empty result, not an error, when no entity matches.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 37d4adf92fc3450139bbd11f3f94b42ef48415c987a44aaa448d2f93a976f0cf
semantic_inventory:
  - claim_key: CLAIM-BBB9965BF22DF665
    claim_text: The kb_query MCP tool must retrieve entities by the structured filters id, type, sourceFile and tags
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
  - claim_key: CLAIM-AF3C0A24FFE156A1
    claim_text: The kb_query MCP tool must page results with the limit and offset parameters
    role: normative
    status: modeled
    span:
      start: 102
      end: 178
  - claim_key: CLAIM-F1952E51CF943BCB
    claim_text: The kb_query MCP tool must return entities as structured content
    role: normative
    status: modeled
    span:
      start: 180
      end: 244
  - claim_key: CLAIM-E0AD013FC8777CE8
    claim_text: The kb_query MCP tool must return an empty result, not an error, when no entity matches
    role: normative
    status: modeled
    span:
      start: 246
      end: 333
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:33:39.000Z'
firmness: default
required_evidence: tested
rationale: "Agents need precise, pageable lookups by id, type, file and tag, and an empty match must not look like a failure."
---
- The kb_query MCP tool must retrieve entities by the structured filters id, type, sourceFile and tags.
- The kb_query MCP tool must page results with the limit and offset parameters.
- The kb_query MCP tool must return entities as structured content.
- The kb_query MCP tool must return an empty result, not an error, when no entity matches.
