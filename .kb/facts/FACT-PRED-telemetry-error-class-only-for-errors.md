---
title: 'Predicate: conditional_behavior(telemetry_event,status_other_than_error,omit_error_class_name)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - status_other_than_error
  - omit_error_class_name
canonical_key: conditional_behavior(telemetry_event,status_other_than_error,omit_error_class_name)
polarity: assert
claim_key: CLAIM-60101C869DB5940E
claim_text: A telemetry event shall carry an error class name only when its status is error
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T13:44:13.260Z'
id: FACT-PRED-telemetry-error-class-only-for-errors
type: fact
---
A telemetry event shall carry an error class name only when its status is error. Grounds one clause of REQ-kibi-telemetry-expected-outcomes as a conditional behavior of telemetry events.