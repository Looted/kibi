---
title: kb_search returns an entity the answer already quotes only once
status: open
firmness: default
priority: should
required_evidence: tested
tags:
  - search
  - mcp
  - cost
semantic_text: When kb_search returns an answer and fields is not "full", a result whose entity the answer already quotes with its statement or claim must give only its id, type, title, score and match reasons. Every other result keeps its summary fields.
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24, of the statement as worded: "All approved."'
  approved_by: maintainer
  recorded_at: '2026-11-24T19:21:47.600Z'
semantic_inventory:
  - claim_key: CLAIM-619357C05778C80E
    claim_text: When kb_search returns an answer
    role: condition
    status: modeled
    span:
      start: 0
      end: 32
  - claim_key: CLAIM-AB6CCA2C6CFCC618
    claim_text: fields is not "full", a result whose entity the answer already quotes with its statement or claim must give only its id, type, title, score and match reasons
    role: normative
    status: modeled
    span:
      start: 37
      end: 194
  - claim_key: CLAIM-E619CE0BAF7D413D
    claim_text: Every other result keeps its summary fields
    role: descriptive
    status: modeled
    span:
      start: 196
      end: 239
logic_claims:
  - CLAIM-619357C05778C80E
  - CLAIM-AB6CCA2C6CFCC618
  - CLAIM-E619CE0BAF7D413D
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8576fa75b6741b48f3764b32409a56ca57cba62215de935247299bec6ab27b2b
rationale: 'A kb_search result and the answer beside it carried the same entity twice: the answer quotes a governing requirement''s statement and each fact''s claim, and the result repeated the entity with its snippet and evidence. On this repository''s own questions that repetition was 8 to 15 percent of a kb_search result.'
id: REQ-kb-search-answered-results-identity-only
type: req
---
When kb_search returns an answer and fields is not "full", a result whose entity the answer already quotes with its statement or claim must give only its id, type, title, score and match reasons. Every other result keeps its summary fields.

## Context

A kb_search result and the answer beside it carried the same entity twice: the answer quotes a governing requirement's statement and each fact's claim, and the result repeated the entity with its snippet and evidence. On this repository's own questions that repetition was 8 to 15 percent of a kb_search result.

## Source

> All approved.

Maintainer reply, 2026-11-24, to the four statements proposed for the second benchmark cost change.
