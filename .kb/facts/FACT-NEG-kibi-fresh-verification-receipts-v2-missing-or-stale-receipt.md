---
title: A requirement's end-to-end test has no proof receipt, or only one from before the source changed
status: active
fact_kind: predicate
predicate_name: verification_receipt_rule
predicate_args:
  - requirement_proof
  - unfresh_or_invalid_receipt
  - not_proven
polarity: deny
predicate_namespace: kibi.verification
canonical_key: verification_receipt_rule(requirement_proof,unfresh_or_invalid_receipt,not_proven)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:02.138Z'
id: FACT-NEG-kibi-fresh-verification-receipts-v2-missing-or-stale-receipt
type: fact
---
