---
title: A cut list result returns at least one row
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: cut_list_rows_returned
operator: gte
value_type: int
value_int: 1
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-9F15CD82492548EB
claim_text: A list result cut to the size budget must return at least one row
text_ref: REQ-result-budget-min-row
id: FACT-result-budget-min-row
type: fact
---
A list result cut to the budget still returns one row or more. Grounds the clause of REQ-result-budget-min-row.