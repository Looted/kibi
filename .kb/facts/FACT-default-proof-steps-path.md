---
title: The default proof steps source shall be the proof/steps directory, with one file per proof-bearing test named after its test id, and proof/steps.json when that directory does not exist
status: active
fact_kind: property_value
subject_key: kibi.proof.steps
claim_key: CLAIM-435BE68CBC8205AD
claim_text: The default proof steps source shall be the proof/steps directory, with one file per proof-bearing test named after its test id, and proof/steps.json when that directory does not exist
text_ref: REQ-kibi-proof-step-settings
property_key: steps_path
operator: eq
value_type: string
value_string: proof/steps
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:28.937Z'
id: FACT-default-proof-steps-path
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.