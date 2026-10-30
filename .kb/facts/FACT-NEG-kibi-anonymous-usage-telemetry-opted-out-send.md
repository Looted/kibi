---
title: A user has opted out of telemetry with DO_NOT_TRACK=1 and a Kibi command would still send its usage event
status: active
fact_kind: property_value
subject_key: kibi.usage_telemetry
property_key: opt_out_switches_that_disable_telemetry
operator: eq
value_type: set
value_set:
  - 'KIBI_TELEMETRY=0'
  - 'kibi telemetry disable'
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:24.861Z'
id: FACT-NEG-kibi-anonymous-usage-telemetry-opted-out-send
type: fact
---
