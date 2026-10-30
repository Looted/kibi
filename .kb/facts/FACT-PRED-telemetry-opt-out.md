---
title: 'Predicate: not conditional_behavior(kibi_usage_telemetry,opt_out_set,send_anonymous_events_to_posthog)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_usage_telemetry
  - opt_out_set
  - send_anonymous_events_to_posthog
canonical_key: conditional_behavior(kibi_usage_telemetry,opt_out_set,send_anonymous_events_to_posthog)
polarity: deny
claim_key: CLAIM-3B08B01970785EE6
claim_text: KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:30.683Z'
id: FACT-PRED-telemetry-opt-out
type: fact
---
KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.