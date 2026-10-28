---
title: The repeated mutation failure threshold is 3 failed upserts
status: active
fact_kind: property_value
subject_key: kibi.telemetry.acceptance_policy
property_key: repeated_mutation_failure_threshold
operator: eq
value_type: int
value_int: 3
claim_key: CLAIM-7359B46424CC0BF4
claim_text: The repeated mutation failure threshold shall be 3 failed upserts
text_ref: REQ-kibi-telemetry-acceptance-thresholds
origin:
  kind: agent
  recorded_at: '2026-10-28T09:43:12.705Z'
id: FACT-telemetry-retry-threshold
type: fact
---
DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.repeatedMutationFailureThreshold in packages/cli/src/public/telemetry-acceptance.ts.