---
title: A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results
status: active
fact_kind: property_value
subject_key: kibi.proof.protocol
claim_key: CLAIM-85C47F78B8ECB253
claim_text: A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results
text_ref: REQ-kibi-proof-protocol-versions
property_key: run_outcomes
operator: eq
value_type: set
value_set:
  - passed
  - failed
  - errored
  - cancelled
  - timed_out
  - interrupted
  - no_results
origin:
  kind: agent
  recorded_at: '2026-10-28T10:53:59.725Z'
id: FACT-proof-run-outcomes
type: fact
---
packages/cli/src/public/proof-protocol.ts versions every proof document REQ-kibi-verification-evidence-contract defines (contracts, receipts, runs and integrations) and closes the list of outcomes a proof run can report. They are stated here so each is proved against the constant.