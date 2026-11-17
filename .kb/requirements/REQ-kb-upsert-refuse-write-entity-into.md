---
title: kb_upsert must refuse to write an entity into an existing authored document that holds another…
status: open
firmness: default
required_evidence: tested
origin:
  kind: agent
  recorded_at: '2026-11-17T18:13:27.613Z'
rationale: An upsert with document.path set to an id-less ADR replaced that ADR, and the next sync dropped it from the KB with only an id-style warning.
semantic_text: kb_upsert must refuse to write an entity into an existing authored document that holds another entity, including a document without an id that the store does not read the written entity from.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c0a6b01364f16f9dc91c920d6c988a966185372dd32d28108553bd924b4ead13
semantic_inventory:
  - claim_key: CLAIM-E207DE33B530FD87
    claim_text: kb_upsert must refuse to write an entity into an existing authored document that holds another entity, including a document without an id that the store does not read the written entity from
    role: normative
    status: modeled
    span:
      start: 0
      end: 190
    subjects:
      - mcp.kb_upsert
logic_claims:
  - CLAIM-E207DE33B530FD87
id: REQ-kb-upsert-refuse-write-entity-into
type: req
---
kb_upsert must refuse to write an entity into an existing authored document that holds another entity, including a document without an id that the store does not read the written entity from.

## Context

An upsert with document.path set to an id-less ADR replaced that ADR, and the next sync dropped it from the KB with only an id-style warning.
