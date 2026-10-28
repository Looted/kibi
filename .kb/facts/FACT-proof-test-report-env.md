---
title: The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT
status: active
fact_kind: property_value
subject_key: kibi.proof.steps
claim_key: CLAIM-9B373E83EA0B0ACA
claim_text: The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT
text_ref: REQ-kibi-proof-step-settings
property_key: report_env
operator: eq
value_type: string
value_string: KIBI_PROOF_TEST_REPORT
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:29.705Z'
id: FACT-proof-test-report-env
type: fact
---
REQ-kibi-fresh-verification-receipts-v2 lets a command proof integration attribute a failing step to the tests that own it through a per-test report. The steps file, the environment variable that names the report, its version and its outcomes are stated here so each is proved against the constant.