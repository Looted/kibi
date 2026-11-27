---
title: 'Failure side: no oversized row is returned uncut or without its omitted parts'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: oversized_rows_uncut_or_unnamed
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-budget-row-cut-UNCUT-ROW
type: fact
---
The failure side of REQ-result-budget-row-cut: given the same row, a result that returns it uncut, drops it, or omits parts without naming them fails the unit tests' assertions.