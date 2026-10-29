---
title: 'Predicate: conditional_behavior(telemetry_event,any_telemetry_event,contain_only_summary_fields)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - any_telemetry_event
  - contain_only_summary_fields
canonical_key: conditional_behavior(telemetry_event,any_telemetry_event,contain_only_summary_fields)
polarity: assert
claim_key: CLAIM-58F2F9B853FA8EC8
claim_text: Telemetry events shall contain only fixed operation names, statuses, durations, error categories, package versions, platform, a random install id and a hashed host session id
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:28.194Z'
id: FACT-PRED-telemetry-summary-fields-only
type: fact
---
Telemetry events shall contain only fixed operation names, statuses, durations, error categories, package versions, platform, a random install id and a hashed host session id. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.