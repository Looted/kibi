---
title: kb_upsert advertises its proof fields as stubs and validates them in full
status: open
priority: must
required_evidence: tested
tags:
  - mcp
  - mutation
  - validation
semantic_text: The MCP server must advertise the kb_upsert proof_contract, proof_bindings and proof_receipts fields as stubs that carry only a type and a one-line summary. kb_upsert must validate its input against the full operation contract on MCP and on the CLI JSON route. A kb_upsert input rejected under a stubbed field must return that field's full schema in the error message.
semantic_clauses:
  - The MCP server must advertise the kb_upsert proof_contract, proof_bindings and proof_receipts fields as stubs that carry only a type and a one-line summary.
  - kb_upsert must validate its input against the full operation contract on MCP and on the CLI JSON route.
  - A kb_upsert input rejected under a stubbed field must return that field's full schema in the error message.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: acd6c4110188a5096e38e8b906a64d836e3b6c18bc07aebdbe1b030a167703dd
semantic_inventory:
  - claim_key: CLAIM-5905EC35F9293779
    claim_text: The MCP server must advertise the kb_upsert proof_contract, proof_bindings and proof_receipts fields as stubs that carry only a type and a one-line summary
    role: normative
    status: modeled
    span:
      start: 0
      end: 155
  - claim_key: CLAIM-8677238E2F3C0045
    claim_text: kb_upsert must validate its input against the full operation contract on MCP and on the CLI JSON route
    role: normative
    status: modeled
    span:
      start: 157
      end: 259
  - claim_key: CLAIM-FB2BEEEC77D8155B
    claim_text: A kb_upsert input rejected under a stubbed field must return that field's full schema in the error message
    role: normative
    status: modeled
    span:
      start: 261
      end: 367
logic_claims:
  - CLAIM-5905EC35F9293779
  - CLAIM-8677238E2F3C0045
  - CLAIM-FB2BEEEC77D8155B
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-11-15T18:31:01.102Z'
rationale: Every MCP session loads the kb_upsert tool schema, and its proof fields made up about 17,000 of its 40,000 characters although few writes set them.
id: REQ-mcp-upsert-proof-fields-advertised-as-stubs
type: req
---
The MCP server must advertise the kb_upsert proof_contract, proof_bindings and proof_receipts fields as stubs that carry only a type and a one-line summary. kb_upsert must validate its input against the full operation contract on MCP and on the CLI JSON route. A kb_upsert input rejected under a stubbed field must return that field's full schema in the error message.

## Context

Every MCP session pays for the kb_upsert tool schema in its context, and the proof_contract, proof_bindings and proof_receipts schemas made up about 17,000 of its 40,000 characters, while few writes set those fields. The tool now advertises them as stubs. Hiding a schema must not loosen validation, so every call is still validated against the full contract, and a rejection under a stubbed field spells out that field's schema, so a writer that needs it learns it from the refusal.

## Source

Maintainer-approved statement (2026-11-15): "The MCP server must advertise the kb_upsert proof_contract, proof_bindings and proof_receipts fields as stubs that carry only a type and a one-line summary. kb_upsert must validate its input against the full operation contract on MCP and on the CLI JSON route. A kb_upsert input rejected under a stubbed field must return that field's full schema in the error message."