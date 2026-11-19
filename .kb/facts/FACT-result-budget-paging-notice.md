---
title: Every cut result states its paging
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: cut_results_without_paging_notice
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
claim_key: CLAIM-7406D1765BB0EA20
claim_text: A result cut to the size budget must state how many rows it returned, how many it left out and the offset to call again with, and name that call in its next actions
text_ref: REQ-result-budget-paging-notice
id: FACT-result-budget-paging-notice
type: fact
---
No cut result leaves out the returned and omitted counts, the next offset or the next action that names the call. Grounds the clause of REQ-result-budget-paging-notice.