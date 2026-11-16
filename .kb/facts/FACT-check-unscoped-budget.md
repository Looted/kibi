---
title: An unscoped kb_check keeps to the scoped check's size budget
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: unscoped_result_budget_chars
operator: lte
value_type: int
value_int: 24000
tags:
  - lane:strict
  - fact:property_value
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
claim_key: CLAIM-0022C0CB43F80E52
claim_text: kb_check run without a rule or file scope must cut its result to the same size budget as a scoped check, keeping each blocking rule and the full violation count
text_ref: REQ-check-unscoped-budget
id: FACT-check-unscoped-budget
type: fact
---
kb_check without a rule or file scope cuts its structured result to 24,000 characters, the scoped check's budget, keeping each blocking rule named and count complete. Grounds the clause of REQ-check-unscoped-budget.