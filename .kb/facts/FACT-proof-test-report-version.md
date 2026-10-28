---
title: The per-test proof report version shall be kibi.proof-test-report.v1
status: active
fact_kind: property_value
subject_key: kibi.proof.steps
claim_key: CLAIM-EBFEB6B891A3FA1A
claim_text: The per-test proof report version shall be kibi.proof-test-report.v1
text_ref: REQ-kibi-proof-step-settings
property_key: report_version
operator: eq
value_type: string
value_string: kibi.proof-test-report.v1
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:30.526Z'
id: FACT-proof-test-report-version
type: fact
---
REQ-kibi-fresh-verification-receipts-v2 lets a command proof integration attribute a failing step to the tests that own it through a per-test report. The steps file, the environment variable that names the report, its version and its outcomes are stated here so each is proved against the constant.