---
title: The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED
status: active
fact_kind: property_value
subject_key: kibi.engine.read_limits
claim_key: CLAIM-D353B291DCC8ABF9
claim_text: The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED
text_ref: REQ-core-engine-read-limit-settings
property_key: limit_error_code
operator: eq
value_type: string
value_string: QUERY_LIMIT_EXCEEDED
origin:
  kind: agent
  recorded_at: '2026-10-28T10:30:28.339Z'
id: FACT-engine-query-limit-code
type: fact
---
packages/cli/src/engine-limits.ts holds the environment variable names REQ-core-engine-read-limits uses to turn read limits on, the error code a read that hits its limit fails with, and the cap that keeps a requested time limit below the engine's 120 second hard query timeout. They are stated here so each is proved against the constant; how the limits behave stays in REQ-core-engine-read-limits.