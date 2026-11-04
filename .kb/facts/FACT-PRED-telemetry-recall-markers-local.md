---
title: 'Predicate: conditional_behavior(telemetry_event,recall_marker,stay_local_as_one_way_hash)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - recall_marker
  - stay_local_as_one_way_hash
canonical_key: conditional_behavior(telemetry_event,recall_marker,stay_local_as_one_way_hash)
polarity: assert
claim_key: CLAIM-F3258F2810B8E57E
claim_text: Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:34.692Z'
id: FACT-PRED-telemetry-recall-markers-local
type: fact
---
Retry, repeated search and skill load markers shall stay on the user's machine as one-way hashes. Grounds one clause of REQ-kibi-telemetry-agent-signals as a conditional behavior of telemetry events.