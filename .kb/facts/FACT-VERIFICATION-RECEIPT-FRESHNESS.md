---
id: FACT-VERIFICATION-RECEIPT-FRESHNESS
title: Current-snapshot proof requires a fresh passing receipt
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-VERIFICATION-RECEIPT-FRESHNESS.md
tags: [lane:ontology, requirements, verification, receipts]
fact_kind: predicate
predicate_namespace: kibi.verification
predicate_name: verification_receipt_rule
predicate_args: [current_code_snapshot, newest_receipt, fresh_passing_within_seven_days]
canonical_key: verification_receipt_rule(current_code_snapshot,newest_receipt,fresh_passing_within_seven_days)
polarity: assert
claim_key: CLAIM-A3834334B2DFAF17
claim_text: The newest proof receipt for the current code snapshot must be passing and no older than seven days
---

Ground predicate for the current-snapshot freshness window.
