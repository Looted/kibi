---
title: Grounding facts get their claim key derived from the claim text
status: open
priority: must
tags:
  - facts
  - observation
  - review
  - claim-key
semantic_text: Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key. Kibi must derive claim_key from claim_text for any other fact that carries claim_text without claim_key. Kibi must reject a fact whose claim_key does not equal the key derived from its claim_text.
semantic_source_field: semantic_text
semantic_source_hash: 6d4c6592db7617d2258e931f3a2a477ac5ca54f8dc88fc83dd110bb02ae4ce2a
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_inventory:
  - claim_key: CLAIM-8CB418131CE3FC33
    claim_text: Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
  - claim_key: CLAIM-D08A376052164D10
    claim_text: Kibi must derive claim_key from claim_text for any other fact that carries claim_text without claim_key
    role: normative
    status: modeled
    span:
      start: 98
      end: 201
  - claim_key: CLAIM-AEAB10C0C620D768
    claim_text: Kibi must reject a fact whose claim_key does not equal the key derived from its claim_text
    role: normative
    status: modeled
    span:
      start: 203
      end: 293
semantic_clauses:
  - Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key.
  - Kibi must derive claim_key from claim_text for any other fact that carries claim_text without claim_key.
  - Kibi must reject a fact whose claim_key does not equal the key derived from its claim_text.
logic_claims:
  - CLAIM-8CB418131CE3FC33
  - CLAIM-D08A376052164D10
  - CLAIM-AEAB10C0C620D768
rationale: The search-lane round-1 A10 trace failed on a guessed claim_key; the key is derivable from claim_text, so Kibi derives it and only checks a supplied key.
origin:
  kind: agent
  recorded_at: '2026-10-12T10:28:02.663Z'
id: REQ-kibi-review-observation-claim-text-v2
type: req
firmness: firm
approval_ref: Maintainer confirmed this as a firm rule on 2026-10-16
---
Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key. Kibi must derive claim_key from claim_text for any other fact that carries claim_text without claim_key. Kibi must reject a fact whose claim_key does not equal the key derived from its claim_text.

## Context

Round 1 of the search-lane evaluation ended a modeling trace on `claim_key must equal the stable key derived from claim_text` after the agent guessed the key. The key is a pure function of the clause text, so asking the agent to supply it adds no information and only adds a way to fail. This supersedes REQ-kibi-review-observation-claim-text: a grounding fact (`property_value`, `predicate`, `rule`) may send `claim_text` alone and Kibi derives the key on `kb_upsert` and on `kibi sync`; a key that is sent must still equal the derived one, so a copied pair keeps its integrity check; observation and meta facts keep quoting a claim without a key. Decided by the project owner in the search-lane thread on 2026-10-12 ("Derive it").

## Source

> Derive it.

Project owner, search-lane thread, 2026-10-12, after the recommendation to derive the key when absent and keep rejecting a mismatched supplied key.
