---
title: A search answer shall keep at most 280 characters of an ADR decision excerpt
status: active
fact_kind: property_value
subject_key: kibi.search.answer_limits
claim_key: CLAIM-779D56CBE5452DFC
claim_text: A search answer shall keep at most 280 characters of an ADR decision excerpt
text_ref: REQ-kibi-search-answer-limits
property_key: excerpt_chars
operator: eq
value_type: int
value_int: 280
origin:
  kind: agent
  recorded_at: '2026-10-28T11:10:09.323Z'
id: FACT-search-answer-excerpt-chars
type: fact
---
SEARCH_ANSWER_LIMITS in packages/cli/src/search-answer.ts bounds the answer REQ-kibi-search-answer-layer-v2 returns: its size in bytes, the entity rows it loads, the governing requirements and linked facts it lists, and the length of an ADR excerpt. Each bound is stated here so it is proved against the field.