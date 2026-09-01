---
id: FACT-VERIFICATION-RECEIPT-REJECTS-INVALID
title: Unfresh or invalid receipts cannot prove requirements
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-VERIFICATION-RECEIPT-REJECTS-INVALID.md
tags: [lane:ontology, requirements, verification, receipts]
fact_kind: predicate
predicate_namespace: kibi.verification
predicate_name: verification_receipt_rule
predicate_args: [requirement_proof, unfresh_or_invalid_receipt, not_proven]
canonical_key: verification_receipt_rule(requirement_proof,unfresh_or_invalid_receipt,not_proven)
polarity: assert
claim_key: CLAIM-BB50FABD208405B7
claim_text: A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement.
---

Ground predicate for conservative rejection of unusable evidence.
