---
title: A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results
status: active
fact_kind: property_value
subject_key: kibi.proof.protocol
claim_key: CLAIM-85C47F78B8ECB253
claim_text: A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results
text_ref: REQ-kibi-proof-protocol-versions
property_key: run_outcomes
operator: eq
value_type: set
value_set:
  - passed
  - failed
  - errored
  - cancelled
  - timed_out
  - interrupted
  - no_results
origin:
  kind: agent
  recorded_at: '2026-10-28T10:53:59.725Z'
id: FACT-proof-run-outcomes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.