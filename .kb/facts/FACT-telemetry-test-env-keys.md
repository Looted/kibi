---
title: A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT
status: active
fact_kind: property_value
subject_key: kibi.telemetry.automation_keys
claim_key: CLAIM-25B6330588FD2199
claim_text: A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT
text_ref: REQ-kibi-telemetry-automation-keys
property_key: test_env_keys
operator: eq
value_type: set
value_set:
  - NODE_ENV=test
  - JEST_WORKER_ID
  - VITEST
  - VITEST_WORKER_ID
  - NODE_TEST_CONTEXT
origin:
  kind: agent
  recorded_at: '2026-10-29T16:26:48.478Z'
id: FACT-telemetry-test-env-keys
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.