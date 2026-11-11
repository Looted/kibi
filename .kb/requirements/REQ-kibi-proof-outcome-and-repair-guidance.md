---
title: Coverage reports the proof outcome apart from structural coverage, with ranked repairs for every gap
status: open
semantic_text: Coverage reports must publish a proof outcome separately from structural coverage. Missing or unresolved evidence must produce explicit ranked repair guidance.
semantic_clauses:
  - Coverage reports must publish a proof outcome separately from structural coverage
  - Missing or unresolved evidence must produce explicit ranked repair guidance
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bcf6a4fffe849779be8ebcd7b0019ed223f792e7ba19224420e1a56647eeda7a
semantic_inventory:
  - claim_key: CLAIM-4C1ABF87560ED8A7
    claim_text: Coverage reports must publish a proof outcome separately from structural coverage
    role: normative
    status: modeled
    span:
      start: 0
      end: 81
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-9A7C59796E5CDB94
    claim_text: Missing or unresolved evidence must produce explicit ranked repair guidance
    role: normative
    status: modeled
    span:
      start: 83
      end: 158
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4C1ABF87560ED8A7
  - CLAIM-9A7C59796E5CDB94
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:18:12.086Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - requirements
  - proof
  - coverage
id: REQ-kibi-proof-outcome-and-repair-guidance
type: req
---
Coverage reports must publish a proof outcome separately from structural coverage. Missing or unresolved evidence must produce explicit ranked repair guidance.

## Context

Structural coverage and proof answer different questions, so a reader always sees both and, when proof is missing, the next repair to make.

Proof status is what other repositories read to trust a requirement, so it must never be granted on structure alone or on evidence that does not reach the requirement's own words and code.

## Why this changed

Split from REQ-kibi-conservative-requirement-proof, which held three behaviors: the ledger, grounding and contradiction stages; the end-to-end evidence chain; and reporting the proof outcome apart from structural coverage with ranked repairs. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
