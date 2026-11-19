---
title: 'Failure side: an operation result''s data is at most 24,000 characters'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: result_data_chars
operator: gt
value_type: int
value_int: 24000
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-budget-chars-OVER-BUDGET
type: fact
---
The failure side of REQ-result-budget-chars: given the same call, a result whose data is larger than 24,000 characters fails the unit and parity tests' assertions.