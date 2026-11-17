---
title: Each step of one kibi check saves its own analysis cache and drops the other steps' analyses
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: parsed_analyses_dropped_from_cache
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
id: FACT-NEG-check-analysis-cache-shared-EVICTS
type: fact
---
The failure side of REQ-check-analysis-cache-shared: each step of one kibi check saves its own analysis cache and drops the other steps' analyses.