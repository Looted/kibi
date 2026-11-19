---
title: A returned list or report read is at most 64,000 characters
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: read_result_data_chars
operator: lte
value_type: int
value_int: 64000
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-EF5419EC9C36D96C
claim_text: A list or report read result larger than 64,000 characters must be refused with RESULT_TOO_LARGE
text_ref: REQ-result-ceiling
id: FACT-result-ceiling-chars
type: fact
---
A list or report read never returns data over 64,000 characters; past it the call fails with RESULT_TOO_LARGE. Bounded outputs are returned whole. Grounds the clause of REQ-result-ceiling.