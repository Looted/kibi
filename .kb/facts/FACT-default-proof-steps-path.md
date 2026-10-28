---
title: The default proof steps file shall be proof/steps.json
status: active
fact_kind: property_value
subject_key: kibi.proof.steps
claim_key: CLAIM-9C090DC61B833364
claim_text: The default proof steps file shall be proof/steps.json
text_ref: REQ-kibi-proof-step-settings
property_key: steps_path
operator: eq
value_type: string
value_string: proof/steps.json
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:28.937Z'
id: FACT-default-proof-steps-path
type: fact
---
REQ-kibi-fresh-verification-receipts-v2 lets a command proof integration attribute a failing step to the tests that own it through a per-test report. The steps file, the environment variable that names the report, its version and its outcomes are stated here so each is proved against the constant.