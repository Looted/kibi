---
title: A rule selection's page of findings is at most 24,000 characters
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: rule_selection_page_chars
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
claim_key: CLAIM-39953DCBB67B4A87
claim_text: A kb_check with a rule selection must list its findings in pages that keep to the size budget
text_ref: REQ-check-rule-selection-pages
distinct_from:
  - kibi.check.unscoped_result_budget_chars
id: FACT-check-rule-selection-page-chars
type: fact
---
A kb_check with rules returns at most 24,000 characters per page of findings. Grounds the clause of REQ-check-rule-selection-pages.