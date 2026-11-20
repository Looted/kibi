---
title: A preparation page's data is at most 24,000 characters
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: preparation_page_data_chars
operator: lte
value_type: int
value_int: 24000
tags:
  - lane:strict
  - fact:property_value
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
claim_key: CLAIM-9636CFDBA0B30EAE
claim_text: Kibi must page the preparation's file rows within the result budget
text_ref: REQ-impact-review-preparation-paging
id: FACT-impact-review-preparation-page-chars
type: fact
distinct_from:
  - kibi.operation_result.result_data_chars
  - kibi.check.rule_selection_page_chars
  - kibi.check.unscoped_result_budget_chars
  - mcp.kb_check.scoped_check_budget_chars
---
The file rows a preparation returns are cut so the page's data stays within the 24,000-character result budget. Grounds the clause of REQ-impact-review-preparation-paging.