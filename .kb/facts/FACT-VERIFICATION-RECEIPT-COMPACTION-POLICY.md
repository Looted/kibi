---
title: Proof ingest compacts receipt history to the receipts that can decide proof
status: active
tags:
  - lane:ontology
  - verification
  - receipts
  - compaction
claim_key: CLAIM-EAC6FD7EE537498D
claim_text: Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot
text_ref: .kb/requirements/REQ-kibi-fresh-verification-receipts-v2.md
fact_kind: predicate
predicate_name: verification_receipt_rule
predicate_args:
  - proof_ingest
  - receipt_history
  - compacted_to_proof_deciding_receipts
polarity: assert
canonical_key: verification_receipt_rule(proof_ingest,receipt_history,compacted_to_proof_deciding_receipts)
predicate_namespace: kibi.verification
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:14.317Z'
id: FACT-VERIFICATION-RECEIPT-COMPACTION-POLICY
type: fact
---
