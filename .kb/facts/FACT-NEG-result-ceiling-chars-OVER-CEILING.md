---
title: 'Failure side: a returned read result is at most 64,000 characters'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: read_result_data_chars
operator: gt
value_type: int
value_int: 64000
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-ceiling-chars-OVER-CEILING
type: fact
---
The failure side of REQ-result-ceiling: given the same read, a result returned with more than 64,000 characters of data fails the unit tests' assertions.