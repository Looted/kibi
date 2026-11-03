---
title: 'Predicate: conditional_behavior(telemetry_event,any_telemetry_event,carry_telemetry_version_2)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - any_telemetry_event
  - carry_telemetry_version_2
canonical_key: conditional_behavior(telemetry_event,any_telemetry_event,carry_telemetry_version_2)
polarity: assert
claim_key: CLAIM-5E42DD14622A5216
claim_text: A telemetry event shall carry telemetry_version 2
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T13:44:14.712Z'
id: FACT-PRED-telemetry-event-version
type: fact
---
A telemetry event shall carry telemetry_version 2. Grounds one clause of REQ-kibi-telemetry-expected-outcomes as a conditional behavior of telemetry events.