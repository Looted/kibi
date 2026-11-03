---
title: 'Predicate: conditional_behavior(telemetry_event,field_name_outside_kibi_schemas,send_field_as_other)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - field_name_outside_kibi_schemas
  - send_field_as_other
canonical_key: conditional_behavior(telemetry_event,field_name_outside_kibi_schemas,send_field_as_other)
polarity: assert
claim_key: CLAIM-58950A6793B032A0
claim_text: A field name that no Kibi schema defines shall be sent as other
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:27.163Z'
id: FACT-PRED-telemetry-unknown-field-as-other
type: fact
---
A field name that no Kibi schema defines shall be sent as other. Grounds one clause of REQ-kibi-telemetry-agent-signals as a conditional behavior of telemetry events.