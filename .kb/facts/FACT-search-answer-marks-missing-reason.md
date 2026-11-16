---
title: The kb_search answer must mark a governing requirement that has no recorded reason
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:55.046Z'
subject_key: kibi.search_answer.requirement_reasons
property_key: governing_requirements_without_reason_left_unmarked
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-F3F0AFFF2FE331EB
claim_text: The kb_search answer must mark a governing requirement that has no recorded reason
text_ref: REQ-search-answer-marks-missing-reason
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-search-answer-marks-missing-reason
id: FACT-search-answer-marks-missing-reason
type: fact
---
Counts governing requirements with no recorded reason whose answer entry does not say so; zero means each carries `why: { recorded: false }`.