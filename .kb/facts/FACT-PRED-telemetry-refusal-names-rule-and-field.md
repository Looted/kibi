---
title: 'Predicate: conditional_behavior(telemetry_event,refused_payload,name_rule_and_schema_field)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - refused_payload
  - name_rule_and_schema_field
canonical_key: conditional_behavior(telemetry_event,refused_payload,name_rule_and_schema_field)
polarity: assert
claim_key: CLAIM-F6134A330752A6E4
claim_text: A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:25.113Z'
id: FACT-PRED-telemetry-refusal-names-rule-and-field
type: fact
---
A telemetry event for a refused payload shall name the rule it broke and the Kibi schema field it concerns. Grounds one clause of REQ-kibi-telemetry-event-contents as a conditional behavior of telemetry events.