---
title: No oversized row is returned uncut or without its omitted parts
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: oversized_rows_uncut_or_unnamed
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-1B67B009E51B6536
claim_text: A single row larger than the size budget must be cut to the budget and name the parts it left out
text_ref: REQ-result-budget-row-cut
id: FACT-result-budget-row-cut
type: fact
---
A row past the budget is always cut to it, and omittedFields names each part that was left out. Grounds the clause of REQ-result-budget-row-cut.