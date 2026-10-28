---
title: A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted
status: active
fact_kind: property_value
subject_key: kibi.proof.steps
claim_key: CLAIM-C11CA176D75C6530
claim_text: A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted
text_ref: REQ-kibi-proof-step-settings
property_key: report_outcomes
operator: eq
value_type: set
value_set:
  - passed
  - failed
  - timed_out
  - errored
  - interrupted
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:31.335Z'
id: FACT-proof-test-report-outcomes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.