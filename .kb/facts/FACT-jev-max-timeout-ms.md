---
title: The maximum Jev timeout is 120000 milliseconds
status: active
fact_kind: property_value
subject_key: kibi.plugin.jev
property_key: max_timeout_ms
operator: eq
value_type: int
value_int: 120000
claim_key: CLAIM-85B214C0394CFC7C
claim_text: The maximum Jev timeout shall be 120000 milliseconds
text_ref: REQ-capability-plugin-jev-defaults
origin:
  kind: agent
  recorded_at: '2026-10-28T09:36:38.867Z'
id: FACT-jev-max-timeout-ms
type: fact
---
JEV_MAX_TIMEOUT_MS in packages/plugin-jev/src/semantic-classifier.ts is the largest timeout the Jev classifier accepts.