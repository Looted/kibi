---
title: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored
status: active
fact_kind: property_value
subject_key: kibi.proof.run_vocabulary
claim_key: CLAIM-D8E61F01CA133EFE
claim_text: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored
text_ref: REQ-kibi-proof-run-vocabulary
property_key: result_outcomes
operator: eq
value_type: set
value_set:
  - passed
  - failed
  - timed_out
  - skipped
  - interrupted
  - errored
origin:
  kind: agent
  recorded_at: '2026-10-28T17:17:19.371Z'
id: FACT-proof-result-outcomes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.