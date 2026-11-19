---
title: 'Failure side: every cut result states its paging'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: cut_results_without_paging_notice
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-budget-paging-notice-SILENT-CUT
type: fact
---
The failure side of REQ-result-budget-paging-notice: given the same cut, a result without the counts, the next offset or the next action fails the unit and parity tests' assertions.