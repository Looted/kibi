---
title: 'Failure side: a rule selection''s page of findings is at most 24,000 characters'
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: rule_selection_page_chars
operator: gt
value_type: int
value_int: 24000
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-check-rule-selection-page-chars-FULL-LISTING
type: fact
---
The failure side of REQ-check-rule-selection-pages: given the same selection, a page over 24,000 characters, or one that skips or repeats findings, fails the unit tests' assertions.