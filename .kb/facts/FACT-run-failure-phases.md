---
title: A proof run failure phase shall be setup, collection, execution, teardown or infrastructure
status: active
fact_kind: property_value
subject_key: kibi.proof.run_vocabulary
claim_key: CLAIM-D6A80A6B786D845A
claim_text: A proof run failure phase shall be setup, collection, execution, teardown or infrastructure
text_ref: REQ-kibi-proof-run-vocabulary
property_key: failure_phases
operator: eq
value_type: set
value_set:
  - setup
  - collection
  - execution
  - teardown
  - infrastructure
origin:
  kind: agent
  recorded_at: '2026-10-28T17:17:20.105Z'
id: FACT-run-failure-phases
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.