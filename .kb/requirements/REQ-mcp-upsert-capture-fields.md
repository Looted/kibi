---
title: kb_upsert advertises the capture fields and the resource describes the rest
status: open
priority: must
required_evidence: tested
semantic_text: The MCP server must advertise only the kb_upsert entity fields used to capture a requirement or decision. The kibi-usage operation-fields resource must describe the kb_upsert entity fields that are not advertised.
rationale: kb_upsert advertised every entity field of every entity type, about 19,000 characters of input schema, while a requirement or decision is captured with about 15 of them. The fact, symbol, test and proof fields stay accepted and validated, and the operation-fields resource describes them for the writer that needs one.
tags:
  - mcp
  - mutation
  - tool-surface
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.'
  recorded_at: '2026-11-16T20:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d9f3dd6a9f8b5a35becc1847299f0e81dda83a91e87d4235220be78098ba022e
semantic_inventory:
  - claim_key: CLAIM-4E8188520B99CD53
    claim_text: The MCP server must advertise only the kb_upsert entity fields used to capture a requirement or decision
    role: normative
    status: modeled
    span:
      start: 0
      end: 104
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-96039E2B93542983
    claim_text: The kibi-usage operation-fields resource must describe the kb_upsert entity fields that are not advertised
    role: normative
    status: modeled
    span:
      start: 106
      end: 212
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4E8188520B99CD53
  - CLAIM-96039E2B93542983
id: REQ-mcp-upsert-capture-fields
type: req
---
The MCP server must advertise only the kb_upsert entity fields used to capture a requirement or decision. The kibi-usage operation-fields resource must describe the kb_upsert entity fields that are not advertised.

## Why

kb_upsert advertised every entity field of every entity type, about 19,000 characters of input schema, while a requirement or decision is captured with about 15 of them. The fact, symbol, test and proof fields stay accepted and validated, and the operation-fields resource describes them for the writer that needs one.

## Source

> Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.