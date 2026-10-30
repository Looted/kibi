---
title: The telemetry acceptance report reads at most 200 usage events
status: active
fact_kind: property_value
subject_key: kibi.telemetry.acceptance_policy
property_key: event_limit
operator: eq
value_type: int
value_int: 200
claim_key: CLAIM-1E510239A7351EB3
claim_text: The telemetry acceptance report shall read at most 200 usage events
text_ref: REQ-kibi-telemetry-acceptance-thresholds
origin:
  kind: agent
  recorded_at: '2026-10-28T09:43:09.373Z'
id: FACT-telemetry-event-limit
type: fact
---
DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.eventLimit in packages/cli/src/public/telemetry-acceptance.ts.