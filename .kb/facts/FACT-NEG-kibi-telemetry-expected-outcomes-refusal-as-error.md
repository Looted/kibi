---
title: Kibi refused an upsert on purpose and its telemetry event would still be counted as an error
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - operation_refused_on_purpose
  - report_status_rejected
canonical_key: conditional_behavior(telemetry_event,operation_refused_on_purpose,report_status_rejected)
polarity: deny
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-03T13:47:25.427Z'
id: FACT-NEG-kibi-telemetry-expected-outcomes-refusal-as-error
type: fact
---
Denies that a telemetry event for an operation Kibi refused on purpose has status rejected, as if an invalid upsert payload were still reported as a Kibi error. The negative scenario for REQ-kibi-telemetry-expected-outcomes assumes it and expects Kibi to reject it.