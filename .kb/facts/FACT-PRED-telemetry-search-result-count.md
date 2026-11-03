---
title: 'Predicate: conditional_behavior(telemetry_event,search_event,report_bucketed_result_count_and_abstention)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - search_event
  - report_bucketed_result_count_and_abstention
canonical_key: conditional_behavior(telemetry_event,search_event,report_bucketed_result_count_and_abstention)
polarity: assert
claim_key: CLAIM-62809A909CC545F5
claim_text: A telemetry event for a search shall report its bucketed result count and whether it abstained
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:30.492Z'
id: FACT-PRED-telemetry-search-result-count
type: fact
---
A telemetry event for a search shall report its bucketed result count and whether it abstained. Grounds one clause of REQ-kibi-telemetry-agent-signals as a conditional behavior of telemetry events.