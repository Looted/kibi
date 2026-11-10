---
title: kibi proof prune keeps each test's newest receipts; migrate-legacy drops legacy receipts only beside a proof contract
status: open
semantic_text: kibi proof prune must shrink each test's receipt history to its newest entries. kibi proof migrate-legacy must drop legacy verification_receipts blocks only from test documents that already carry a proof_contract.
semantic_clauses:
  - kibi proof prune must shrink each test's receipt history to its newest entries
  - kibi proof migrate-legacy must drop legacy verification_receipts blocks only from test documents that already carry a proof_contract
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 54fc07d527364faa053d9d65912198e72561bf0ccd34c036de04d9ed11ebcd1f
semantic_inventory:
  - claim_key: CLAIM-2349CC938A590BB5
    claim_text: kibi proof prune must shrink each test's receipt history to its newest entries
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FF67B1236C167E07
    claim_text: kibi proof migrate-legacy must drop legacy verification_receipts blocks only from test documents that already carry a proof_contract
    role: normative
    status: modeled
    span:
      start: 80
      end: 212
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2349CC938A590BB5
  - CLAIM-FF67B1236C167E07
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T11:19:56.331Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - proof
  - receipts
  - maintenance
id: REQ-kibi-proof-receipt-maintenance
type: req
---
kibi proof prune must shrink each test's receipt history to its newest entries. kibi proof migrate-legacy must drop legacy verification_receipts blocks only from test documents that already carry a proof_contract.

## Context

Receipt history grows with every proof run; prune keeps the newest N receipts per test (1 to 50, default 1) and refuses any other window. Legacy verification_receipts predate proof contracts, so migrate-legacy removes them only where a proof_contract already carries the evidence and leaves legacy-only tests untouched.

Carved out of REQ-kibi-verification-evidence-contract, which keeps the proof receipt contract as a whole; each child names one decision around it.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
