---
title: An operation result's data is at most 24,000 characters
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: result_data_chars
operator: lte
value_type: int
value_int: 24000
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-9B42F6BC43A4E742
claim_text: Each operation result returned over MCP or the CLI JSON route must keep its data within 24,000 characters
text_ref: REQ-result-budget-chars
id: FACT-result-budget-chars
type: fact
distinct_from:
  - kibi.check.unscoped_result_budget_chars
  - kibi.check.rule_selection_page_chars
---
An operation result's data serialized as JSON is at most 24,000 characters on both routes. Grounds the clause of REQ-result-budget-chars.

This fact bounds every operation's result as the shared fitter sees it. kibi.check.unscoped_result_budget_chars and kibi.check.rule_selection_page_chars bound what kb_check's own fit produces for an unscoped check and for a page of a rule selection. They share the value through the same constant, but the check's own bounds hold before the shared fitter runs and are tested on the check executor, so they are separate quantities that happen to share a value.