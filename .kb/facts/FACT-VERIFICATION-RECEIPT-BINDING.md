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
claim_key: CLAIM-CA3A58EE7669E556
claim_text: Each receipt must bind its test ID, typed verification scope, runner command, current code snapshot, environment hash, timestamps, outcome, and artifact digest
---

Ground predicate for the complete receipt-provenance envelope.
