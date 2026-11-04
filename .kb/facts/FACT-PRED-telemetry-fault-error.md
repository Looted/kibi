---
title: 'Predicate: conditional_behavior(telemetry_event,operation_failed_through_kibi_fault,report_status_error)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - operation_failed_through_kibi_fault
  - report_status_error
canonical_key: conditional_behavior(telemetry_event,operation_failed_through_kibi_fault,report_status_error)
polarity: assert
claim_key: CLAIM-80FCD3E55B291BFE
claim_text: A telemetry event for an operation that failed through a Kibi fault shall have status error
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T13:44:11.818Z'
id: FACT-PRED-telemetry-fault-error
type: fact
---
A telemetry event for an operation that failed through a Kibi fault shall have status error. Grounds one clause of REQ-kibi-telemetry-expected-outcomes as a conditional behavior of telemetry events.