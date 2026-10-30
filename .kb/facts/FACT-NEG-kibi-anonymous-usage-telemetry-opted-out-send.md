---
title: A user has opted out of telemetry and a Kibi command would still send its usage event
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_usage_telemetry
  - opt_out_set
  - send_anonymous_events_to_posthog
polarity: assert
canonical_key: conditional_behavior(kibi_usage_telemetry,opt_out_set,send_anonymous_events_to_posthog)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:24.861Z'
id: FACT-NEG-kibi-anonymous-usage-telemetry-opted-out-send
type: fact
---
