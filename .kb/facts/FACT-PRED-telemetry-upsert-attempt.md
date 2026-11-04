---
title: 'Predicate: conditional_behavior(telemetry_event,upsert_event,report_attempt_on_same_entity)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - upsert_event
  - report_attempt_on_same_entity
canonical_key: conditional_behavior(telemetry_event,upsert_event,report_attempt_on_same_entity)
polarity: assert
claim_key: CLAIM-C2ACCA1C21E6D451
claim_text: A telemetry event for an upsert shall report its attempt number on the same entity
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:28.990Z'
id: FACT-PRED-telemetry-upsert-attempt
type: fact
---
A telemetry event for an upsert shall report its attempt number on the same entity. Grounds one clause of REQ-kibi-telemetry-agent-signals as a conditional behavior of telemetry events.