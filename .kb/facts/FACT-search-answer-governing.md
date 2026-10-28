---
title: A search answer shall list at most 5 governing requirements
status: active
fact_kind: property_value
subject_key: kibi.search.answer_limits
claim_key: CLAIM-63645A08C98064C3
claim_text: A search answer shall list at most 5 governing requirements
text_ref: REQ-kibi-search-answer-limits
property_key: governing
operator: eq
value_type: int
value_int: 5
origin:
  kind: agent
  recorded_at: '2026-10-28T11:10:07.779Z'
id: FACT-search-answer-governing
type: fact
---
SEARCH_ANSWER_LIMITS in packages/cli/src/search-answer.ts bounds the answer REQ-kibi-search-answer-layer-v2 returns: its size in bytes, the entity rows it loads, the governing requirements and linked facts it lists, and the length of an ADR excerpt. Each bound is stated here so it is proved against the field.