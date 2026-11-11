---
title: Proof ingest and kibi proof compact keep only the receipts that can still decide proof
status: open
semantic_text: Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot. Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence. kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block.
semantic_clauses:
  - Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot.
  - Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence.
  - kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 388ffebcf29ff2ddb7c61c87d1753292b676984c3e189a14b2e005e1c3b61750
semantic_inventory:
  - claim_key: CLAIM-EAC6FD7EE537498D
    claim_text: Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot
    role: normative
    status: modeled
    span:
      start: 0
      end: 199
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-C2C5945CEAEEED35
    claim_text: Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence
    role: normative
    status: modeled
    span:
      start: 201
      end: 332
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-7E650A33B4789F0E
    claim_text: kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block
    role: normative
    status: modeled
    span:
      start: 334
      end: 465
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
logic_claims:
  - CLAIM-EAC6FD7EE537498D
  - CLAIM-C2C5945CEAEEED35
  - CLAIM-7E650A33B4789F0E
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:30:33.347Z'
priority: must
required_evidence: tested
tags:
  - requirements
  - proof
  - verification
  - receipts
  - compaction
id: REQ-kibi-proof-receipt-compaction
type: req
---
Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot. Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence. kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block.

## Context

Compaction keeps test documents small without ever reordering or inventing history, so every receipt that remains is one that was really recorded.

Receipts are the only evidence that a test really passed against the current code, so a stale, rewritten or misattributed receipt would let a requirement look tested when it is not.

## Why this changed

Split from REQ-kibi-fresh-verification-receipts-v2, which held three behaviors: what a receipt binds and when it is fresh enough to prove, how ingest and kibi proof compact shorten receipt history, and how a command run's outcome is attributed to each test. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
