---
title: An unscoped kb_check returns a result over the scoped check's size budget
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: unscoped_result_budget_chars
operator: gt
value_type: int
value_int: 24000
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: FACT-NEG-check-unscoped-budget-OVER-BUDGET
type: fact
---
The failure side of the rule: an unscoped kb_check result is larger than the 24,000-character budget, or drops a blocking rule or part of the count to fit.