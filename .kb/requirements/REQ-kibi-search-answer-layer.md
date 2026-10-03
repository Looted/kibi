---
title: kb_search answers questions with the current governing requirements and what verifies them
status: open
priority: must
tags:
  - search
  - intent-search
  - answer-layer
  - discovery
semantic_text: kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities. By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling. The search answer layer must state that absence of a match is not evidence.
semantic_clauses:
  - kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities.
  - By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling.
  - The search answer layer must state that absence of a match is not evidence.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: dbdcd0992bcd3c850633d717944f06a72f2cd588ddf1395bf50aa5eb1edc7518
semantic_inventory:
  - claim_key: CLAIM-8470F42B22C072FA
    claim_text: kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities
    role: normative
    span:
      start: 0
      end: 100
    status: ontology_gap
    reason: No reviewed predicate schema declares a kb_search subject; recorded as a review:ontology-gap observation instead of minting atoms.
  - claim_key: CLAIM-6CC80BDBD9B7AAC2
    claim_text: By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling
    role: normative
    span:
      start: 102
      end: 360
    status: ontology_gap
    reason: No reviewed predicate schema declares a kb_search subject; recorded as a review:ontology-gap observation instead of minting atoms.
  - claim_key: CLAIM-DED63830C86F15B5
    claim_text: The search answer layer must state that absence of a match is not evidence
    role: normative
    span:
      start: 362
      end: 436
    status: ontology_gap
    reason: No reviewed predicate schema declares a kb_search subject; recorded as a review:ontology-gap observation instead of minting atoms.
logic_claims:
  - CLAIM-8470F42B22C072FA
  - CLAIM-6CC80BDBD9B7AAC2
  - CLAIM-DED63830C86F15B5
id: REQ-kibi-search-answer-layer
type: req
---
kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities. By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling. The search answer layer must state that absence of a match is not evidence.
