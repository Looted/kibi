---
title: A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted
status: active
fact_kind: property_value
subject_key: kibi.claim_bound_proof.settings
claim_key: CLAIM-C7F57251FDD48ED8
claim_text: A proof receipt outcome shall be passed, failed, errored, cancelled, skipped, timed_out or interrupted
text_ref: REQ-kibi-claim-bound-proof-settings
property_key: receipt_outcomes
operator: eq
value_type: set
value_set:
  - passed
  - failed
  - errored
  - cancelled
  - skipped
  - timed_out
  - interrupted
origin:
  kind: agent
  recorded_at: '2026-10-28T10:57:36.615Z'
id: FACT-proof-receipt-outcomes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.