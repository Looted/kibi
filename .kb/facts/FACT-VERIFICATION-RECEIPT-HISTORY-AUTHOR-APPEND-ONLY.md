---
title: Authors can only append to proof-bearing receipt history
status: active
tags:
  - lane:ontology
  - requirements
  - verification
  - receipts
claim_key: CLAIM-F0E4D725D82887B3
claim_text: Proof-bearing tests must carry kibi.proof-receipt.v1 execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder
text_ref: .kb/requirements/REQ-kibi-fresh-verification-receipts-v2.md
fact_kind: predicate
predicate_name: verification_receipt_rule
predicate_args:
  - proof_bearing_e2e_test
  - execution_receipt_history
  - author_append_only_v1_required
polarity: assert
canonical_key: verification_receipt_rule(proof_bearing_e2e_test,execution_receipt_history,author_append_only_v1_required)
predicate_namespace: kibi.verification
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:09.052Z'
id: FACT-VERIFICATION-RECEIPT-HISTORY-AUTHOR-APPEND-ONLY
type: fact
---
