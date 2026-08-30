---
id: FACT-VERIFICATION-RECEIPT-BINDING
title: Verification receipts bind inspectable execution provenance
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-VERIFICATION-RECEIPT-BINDING.md
tags: [lane:ontology, requirements, verification, receipts]
fact_kind: predicate
predicate_namespace: kibi.verification
predicate_name: verification_receipt_rule
predicate_args: [verification_receipt, required_provenance_fields, source_bound_and_inspectable]
canonical_key: verification_receipt_rule(verification_receipt,required_provenance_fields,source_bound_and_inspectable)
polarity: assert
claim_key: CLAIM-BCC4E6CCF9623500
claim_text: Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest.
---

Ground predicate for the complete receipt-provenance envelope.
