---
title: kibi proof compact applies the ingest policy and rewrites only proof_receipts
status: active
tags:
  - lane:ontology
  - verification
  - receipts
  - compaction
claim_key: CLAIM-7E650A33B4789F0E
claim_text: kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block
text_ref: .kb/requirements/REQ-kibi-fresh-verification-receipts-v2.md
fact_kind: predicate
predicate_name: verification_receipt_rule
predicate_args:
  - proof_compact_command
  - existing_receipt_store
  - same_policy_proof_receipts_block_only
polarity: assert
canonical_key: verification_receipt_rule(proof_compact_command,existing_receipt_store,same_policy_proof_receipts_block_only)
predicate_namespace: kibi.verification
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:19.755Z'
id: FACT-VERIFICATION-RECEIPT-COMPACT-COMMAND
type: fact
---
