---
title: The engine read time limit cap shall be 115000 milliseconds
status: active
fact_kind: property_value
subject_key: kibi.engine.read_limits
claim_key: CLAIM-446DAB32C6107945
claim_text: The engine read time limit cap shall be 115000 milliseconds
text_ref: REQ-core-engine-read-limit-settings
property_key: read_time_limit_cap_ms
operator: eq
value_type: int
value_int: 115000
origin:
  kind: agent
  recorded_at: '2026-10-28T10:30:29.203Z'
id: FACT-engine-read-time-limit-cap
type: fact
---
packages/cli/src/engine-limits.ts holds the environment variable names REQ-core-engine-read-limits uses to turn read limits on, the error code a read that hits its limit fails with, and the cap that keeps a requested time limit below the engine's 120 second hard query timeout. They are stated here so each is proved against the constant; how the limits behave stays in REQ-core-engine-read-limits.