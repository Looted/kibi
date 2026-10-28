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
REQ-kibi-fresh-verification-receipts-v2 lets a command proof integration attribute a failing step to the tests that own it through a per-test report. The steps file, the environment variable that names the report, its version and its outcomes are stated here so each is proved against the constant.