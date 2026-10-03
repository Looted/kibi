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
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema (subject kibi.discovery.search).
  - claim_key: CLAIM-6CC80BDBD9B7AAC2
    claim_text: By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling
    role: normative
    span:
      start: 102
      end: 360
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema (subject kibi.discovery.search).
  - claim_key: CLAIM-DED63830C86F15B5
    claim_text: The search answer layer must state that absence of a match is not evidence
    role: normative
    span:
      start: 362
      end: 436
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema (subject kibi.discovery.search).
logic_claims:
  - CLAIM-8470F42B22C072FA
  - CLAIM-6CC80BDBD9B7AAC2
  - CLAIM-DED63830C86F15B5
id: REQ-kibi-search-answer-layer
type: req
---
kb_search must default to intent-v1 ranking and demote superseded, deprecated, and rejected entities. By default kb_search must return a kibi.search-answer.v1 answer layer listing the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, superseded non-governing entries, and observation notes within a byte ceiling. The search answer layer must state that absence of a match is not evidence.
