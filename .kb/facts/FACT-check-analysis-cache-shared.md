---
title: One kibi check keeps every source analysis it parsed in the branch analysis cache
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: parsed_analyses_dropped_from_cache
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
claim_text: kibi check must keep, in the branch's source analysis cache, every source file analysis that any of its steps parsed in that run
text_ref: REQ-check-analysis-cache-shared
claim_key: CLAIM-8B129398A54207CA
id: FACT-check-analysis-cache-shared
type: fact
---
The grounded claim of REQ-check-analysis-cache-shared: kibi check must keep, in the branch's source analysis cache, every source file analysis that any of its steps parsed in that run.