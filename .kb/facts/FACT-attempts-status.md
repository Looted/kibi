---
title: A proof run attempts status shall be complete or unavailable
status: active
fact_kind: property_value
subject_key: kibi.proof.run_vocabulary
claim_key: CLAIM-90AD356D3D051F57
claim_text: A proof run attempts status shall be complete or unavailable
text_ref: REQ-kibi-proof-run-vocabulary
property_key: attempts_status
operator: eq
value_type: set
value_set:
  - complete
  - unavailable
origin:
  kind: agent
  recorded_at: '2026-10-28T17:17:22.391Z'
id: FACT-attempts-status
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.