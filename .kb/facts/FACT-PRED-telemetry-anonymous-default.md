---
title: 'Predicate: conditional_behavior(kibi_usage_telemetry,no_opt_out_set,send_anonymous_events_to_posthog)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_usage_telemetry
  - no_opt_out_set
  - send_anonymous_events_to_posthog
canonical_key: conditional_behavior(kibi_usage_telemetry,no_opt_out_set,send_anonymous_events_to_posthog)
polarity: assert
claim_key: CLAIM-B9506D1354D5C2E5
claim_text: Kibi shall send anonymous usage telemetry to its PostHog project by default
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:26.906Z'
id: FACT-PRED-telemetry-anonymous-default
type: fact
---
Kibi shall send anonymous usage telemetry to its PostHog project by default. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.