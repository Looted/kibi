---
title: 'Failure side: a cut list result returns at least one row'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: cut_list_rows_returned
operator: lt
value_type: int
value_int: 1
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-budget-min-row-NO-ROWS
type: fact
---
The failure side of REQ-result-budget-min-row: given the same list, a cut result with no rows fails the unit tests' assertions.