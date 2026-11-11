---
title: An agent sent a payload field no Kibi schema defines and telemetry would still send its name
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - field_name_outside_kibi_schemas
  - send_field_as_other
canonical_key: conditional_behavior(telemetry_event,field_name_outside_kibi_schemas,send_field_as_other)
polarity: deny
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:41.697Z'
id: FACT-NEG-kibi-telemetry-agent-signals-invented-field
type: fact
---
Denies that a field name outside every Kibi schema is sent as other, as if a key an agent invented, which may hold customer vocabulary, reached telemetry. The negative scenario for REQ-kibi-telemetry-event-contents assumes it and expects Kibi to reject it.