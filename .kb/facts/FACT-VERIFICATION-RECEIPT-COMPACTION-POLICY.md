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
fact_kind: property_value
subject_key: kibi.proof.receipts
property_key: receipts_kept_by_ingest_compaction
operator: subset_of
value_type: set
value_set:
  - newest_receipt
  - newest_passing_receipt
  - newest_receipt_per_scope_and_contract_hash
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:14.317Z'
id: FACT-VERIFICATION-RECEIPT-COMPACTION-POLICY
type: fact
---
