---
id: FACT-REQ-PROOF-VERIFICATION-NON-PROOF-OUTCOMES
title: Invalid verification outcomes remain non-proof
status: active
created_at: 2026-08-21T00:00:00.000Z
updated_at: 2026-08-21T00:00:00.000Z
source: documentation/tests/e2e/packed/helpers.ts
tags:
  - lane:strict
  - verification
  - e2e
fact_kind: property_value
predicate_namespace: kibi.verification
predicate_name: logical_requirement_rule
predicate_args:
  - verification_outcome
  - retry_skip_stale_partial_or_contract_mismatch
  - non_proof_outcome
canonical_key: logical_requirement_rule(verification_outcome,retry_skip_stale_partial_or_contract_mismatch,non_proof_outcome)
polarity: require
claim_key: CLAIM-6C829C8424C2387C
claim_text: Retries, skips, stale receipts, partial runs, and mismatched contracts must remain non-proof outcomes
claim_span_start: 250
claim_span_end: 351
subject_key: kibi
property_key: verification_invalid_outcomes_are_non_proof
operator: eq
value_type: bool
value_bool: true
type: fact
---

Ground representation of the non-proof outcome boundary: retried, skipped,
stale, partial, and contract-mismatched verification runs never satisfy a
requirement proof.
