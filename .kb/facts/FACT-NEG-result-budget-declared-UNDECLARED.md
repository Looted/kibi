---
title: 'Failure side: no catalog operation lacks a budget declaration'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: undeclared_catalog_operations
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-budget-declared-UNDECLARED
type: fact
---
The failure side of REQ-result-budget-declared: given an operation added to the catalog without a declaration, the unit tests' assertions fail.