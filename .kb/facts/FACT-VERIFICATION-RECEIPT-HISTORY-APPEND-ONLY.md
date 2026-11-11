---
title: Authors can only append to proof-bearing receipt history
status: active
tags:
  - lane:ontology
  - requirements
  - verification
  - receipts
claim_key: CLAIM-76ACF45E5EAD5F00
claim_text: Proof-bearing tests must carry proof receipt execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder
text_ref: .kb/requirements/REQ-kibi-proof-receipt-freshness.md
fact_kind: predicate
predicate_name: verification_receipt_rule
predicate_args:
  - proof_bearing_e2e_test
  - execution_receipt_history
  - author_append_only_required
polarity: assert
canonical_key: verification_receipt_rule(proof_bearing_e2e_test,execution_receipt_history,author_append_only_required)
predicate_namespace: kibi.verification
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T17:30:00.000Z'
id: FACT-VERIFICATION-RECEIPT-HISTORY-APPEND-ONLY
type: fact
---
Grounds the append-only receipt history clause of REQ-kibi-proof-receipt-freshness without naming a receipt version; the version is stated in REQ-kibi-proof-protocol-versions.
