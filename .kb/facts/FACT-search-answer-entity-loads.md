---
title: A search answer shall load at most 70 entity rows
status: active
fact_kind: property_value
subject_key: kibi.search.answer_limits
claim_key: CLAIM-10E8E19FE532570B
claim_text: A search answer shall load at most 70 entity rows
text_ref: REQ-kibi-search-answer-limits
property_key: entity_loads
operator: eq
value_type: int
value_int: 70
origin:
  kind: agent
  recorded_at: '2026-10-28T11:10:06.982Z'
id: FACT-search-answer-entity-loads
type: fact
---
SEARCH_ANSWER_LIMITS in packages/cli/src/search-answer.ts bounds the answer REQ-kibi-search-answer-layer-v2 returns: its size in bytes, the entity rows it loads, the governing requirements and linked facts it lists, and the length of an ADR excerpt. Each bound is stated here so it is proved against the field.