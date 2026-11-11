---
title: CI reuses a proof only when the code snapshot matches, never on a commit SHA alone
status: open
semantic_text: CI may reuse a proof only when the code snapshot matches. A commit SHA alone must not count as proof.
semantic_clauses:
  - CI may reuse a proof only when the code snapshot matches
  - A commit SHA alone must not count as proof
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2cbd5a89d54ef8f4d61536b72122f60f62913f82932d56c66a7e9d677964be98
semantic_inventory:
  - claim_key: CLAIM-E95292166B44B3DF
    claim_text: CI may reuse a proof only when the code snapshot matches
    role: normative
    status: modeled
    span:
      start: 0
      end: 56
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8EDAE9A2050121EB
    claim_text: A commit SHA alone must not count as proof
    role: normative
    status: modeled
    span:
      start: 58
      end: 100
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-E95292166B44B3DF
  - CLAIM-8EDAE9A2050121EB
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T11:19:59.139Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - proof
  - ci
id: REQ-kibi-ci-proof-reuse
type: req
---
CI may reuse a proof only when the code snapshot matches. A commit SHA alone must not count as proof.

## Context

A merge commit gets a new SHA even when its source is identical, and the same SHA says nothing about what was proven, so CI identifies proof by the canonical workspace snapshot and uses SHAs only for provenance: a pull request reuses a develop proof when the merge snapshot equals the proven snapshot, and runs the full proof otherwise.

Carved out of REQ-kibi-verification-evidence-contract, which keeps the proof receipt contract as a whole; each child names one decision around it.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
