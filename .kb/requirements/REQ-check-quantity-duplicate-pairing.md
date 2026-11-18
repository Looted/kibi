---
title: Two value facts state one quantity when value, file and a signal agree
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - check
  - quantity-duplicate
semantic_text: 'Two value facts state one quantity when their values are equal, their requirements are implemented in the same source file, and one further signal holds: a shared implementing symbol, a proof value source that implements the other requirement, or property keys or claim texts that share at least half their words. The share of words that property keys or claim texts must have in common to tie two value facts shall be 0.5.'
rationale: 'Equal values alone pair far too much: limits like 3, 5 or 280 recur across unrelated features. Requiring the same source file and one naming or code signal kept every split pair the benchmark found on the Kibi repo and dropped the coincidences.'
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T16:10:12.651Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: da36a6e6c9239d02957d6c695f59d2de3a53157177ce6770e55a41dc52b3d942
semantic_inventory:
  - claim_key: CLAIM-C95F5C2F01304652
    claim_text: 'Two value facts state one quantity when their values are equal, their requirements are implemented in the same source file, and one further signal holds: a shared implementing symbol, a proof value source that implements the other requirement, or property keys or claim texts that share at least half their words'
    role: normative
    status: modeled
    span:
      start: 0
      end: 312
  - claim_key: CLAIM-FB2AD2FC43C16DBB
    claim_text: The share of words that property keys or claim texts must have in common to tie two value facts shall be 0.5
    role: normative
    status: modeled
    span:
      start: 314
      end: 422
logic_claims:
  - CLAIM-C95F5C2F01304652
  - CLAIM-FB2AD2FC43C16DBB
id: REQ-check-quantity-duplicate-pairing
type: req
semantic_clauses:
  - 'Two value facts state one quantity when their values are equal, their requirements are implemented in the same source file, and one further signal holds: a shared implementing symbol, a proof value source that implements the other requirement, or property keys or claim texts that share at least half their words.'
  - The share of words that property keys or claim texts must have in common to tie two value facts shall be 0.5.
---
Two value facts state one quantity when their values are equal, their requirements are implemented in the same source file, and one further signal holds: a shared implementing symbol, a proof value source that implements the other requirement, or property keys or claim texts that share at least half their words. The share of words that property keys or claim texts must have in common to tie two value facts shall be 0.5.

## Context

Equal values alone pair far too much: limits like 3, 5 or 280 recur across unrelated features. Requiring the same source file and one naming or code signal kept every split pair the benchmark found on the Kibi repo and dropped the coincidences.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"

Maintainer-approved addition (2026-11-17), stating the value as its own sentence so a certificate can prove it: "The share of words that property keys or claim texts must have in common to tie two value facts shall be 0.5."
