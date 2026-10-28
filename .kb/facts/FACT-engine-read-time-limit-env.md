---
title: The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS
status: active
fact_kind: property_value
subject_key: kibi.engine.read_limits
claim_key: CLAIM-FE1B49EC94E4A1E4
claim_text: The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS
text_ref: REQ-core-engine-read-limit-settings
property_key: time_limit_env
operator: eq
value_type: string
value_string: KIBI_ENGINE_READ_TIME_LIMIT_MS
origin:
  kind: agent
  recorded_at: '2026-10-28T10:30:26.395Z'
id: FACT-engine-read-time-limit-env
type: fact
---
packages/cli/src/engine-limits.ts holds the environment variable names REQ-core-engine-read-limits uses to turn read limits on, the error code a read that hits its limit fails with, and the cap that keeps a requested time limit below the engine's 120 second hard query timeout. They are stated here so each is proved against the constant; how the limits behave stays in REQ-core-engine-read-limits.