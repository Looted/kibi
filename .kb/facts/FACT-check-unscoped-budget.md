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
distinct_from:
  - mcp.kb_check.scoped_check_budget_chars
---
kb_check without a rule or file scope cuts its structured result to 24,000 characters, the scoped check's budget, keeping each blocking rule named and count complete. Grounds the clause of REQ-check-unscoped-budget.

This fact bounds the size of an unscoped check's result (at most 24,000 characters). mcp.kb_check.scoped_check_budget_chars is the budget value itself (exactly 24,000, which FACT-kibi-scoped-check-budget-chars states). Both use the same constant in check-format-shared.ts, but one is a cap on what a result may hold and the other is the setting, so they are different quantities that share a value.