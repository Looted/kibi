---
title: A search answer shall be at most 16384 bytes
status: active
fact_kind: property_value
subject_key: kibi.search.answer_limits
claim_key: CLAIM-46AE98A8124BBE18
claim_text: A search answer shall be at most 16384 bytes
text_ref: REQ-kibi-search-answer-limits
property_key: max_bytes
operator: eq
value_type: int
value_int: 16384
origin:
  kind: agent
  recorded_at: '2026-10-28T11:10:06.195Z'
id: FACT-search-answer-max-bytes
type: fact
---
SEARCH_ANSWER_LIMITS in packages/cli/src/search-answer.ts bounds the answer REQ-kibi-search-answer-layer-v2 returns: its size in bytes, the entity rows it loads, the governing requirements and linked facts it lists, and the length of an ADR excerpt. Each bound is stated here so it is proved against the field.