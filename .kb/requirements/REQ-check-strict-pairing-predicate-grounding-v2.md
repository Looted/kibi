---
title: Strict pairing accepts a predicate about the constrained subject by name or subject key
status: open
priority: must
tags:
  - check
  - modeling
  - predicates
semantic_text: Strict pairing checks must accept a requires_predicate fact whose argument named subject holds the constrained subject key. Strict pairing checks must accept a requires_predicate fact whose own subject key is the constrained subject key.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0a1bc06bf015122f78b93c957876f2ae5e6a4adda00999355eb2c909cd411950
semantic_inventory:
  - claim_key: CLAIM-2D5163391DD7E200
    claim_text: Strict pairing checks must accept a requires_predicate fact whose argument named subject holds the constrained subject key
    role: normative
    span:
      start: 0
      end: 122
    status: modeled
  - claim_key: CLAIM-B97373C4711CFEAF
    claim_text: Strict pairing checks must accept a requires_predicate fact whose own subject key is the constrained subject key
    role: normative
    span:
      start: 124
      end: 236
    status: modeled
logic_claims:
  - CLAIM-2D5163391DD7E200
  - CLAIM-B97373C4711CFEAF
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:24.863Z'
id: REQ-check-strict-pairing-predicate-grounding-v2
type: req
---
Strict pairing checks must accept a requires_predicate fact whose argument named subject holds the constrained subject key. Strict pairing checks must accept a requires_predicate fact whose own subject key is the constrained subject key.

## Context

Round 8 of the external onboarding evaluation found that kb_check only paired a requires_predicate fact with the constrained subject when the predicate's first argument was the subject key. Fourteen built-in predicate schemas do not put a subject argument first or have none, so a replacement plan that kb_model offered left strict-req-fact-pairing on the requirement. This supersedes REQ-check-strict-pairing-predicate-grounding, whose first-argument rule is replaced by the named subject argument or the predicate fact's own subject_key; the first argument stays the fallback for a predicate without a project-local schema or subject_key. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 8, finding K16: the pairing rule and contradiction_ready accept a predicate by its argument named subject or by an explicit subject_key on the predicate fact.
