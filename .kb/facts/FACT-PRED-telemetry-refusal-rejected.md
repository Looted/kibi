---
title: 'Predicate: conditional_behavior(telemetry_event,operation_refused_on_purpose,report_status_rejected)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - operation_refused_on_purpose
  - report_status_rejected
canonical_key: conditional_behavior(telemetry_event,operation_refused_on_purpose,report_status_rejected)
polarity: assert
claim_key: CLAIM-88E92DF303CAE8A7
claim_text: A telemetry event for an operation that Kibi refused on purpose shall have status rejected
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T13:44:09.918Z'
id: FACT-PRED-telemetry-refusal-rejected
type: fact
---
A telemetry event for an operation that Kibi refused on purpose shall have status rejected. Grounds one clause of REQ-kibi-telemetry-expected-outcomes as a conditional behavior of telemetry events.