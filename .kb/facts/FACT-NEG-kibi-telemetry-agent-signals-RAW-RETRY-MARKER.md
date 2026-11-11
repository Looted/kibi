---
title: A retry marker leaves the machine or is kept as the raw entity id
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - recall_marker
  - stay_local_as_one_way_hash
canonical_key: conditional_behavior(telemetry_event,recall_marker,stay_local_as_one_way_hash)
polarity: deny
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-05T07:55:00.000Z'
id: FACT-NEG-kibi-telemetry-agent-signals-RAW-RETRY-MARKER
type: fact
---
Two refused upserts of the same entity record the retry marker as the entity id itself, or the marker is queued for sending.
