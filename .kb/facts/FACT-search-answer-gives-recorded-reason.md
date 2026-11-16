---
title: The kb_search answer must give the recorded reason of each governing requirement
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:52.230Z'
subject_key: kibi.search_answer.requirement_reasons
property_key: governing_requirements_with_recorded_reason_left_out
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-9E98B1DB83A0D5EB
claim_text: The kb_search answer must give the recorded reason of each governing requirement
text_ref: REQ-search-answer-gives-recorded-reason
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-search-answer-gives-recorded-reason
id: FACT-search-answer-gives-recorded-reason
type: fact
---
Counts governing requirements in a kb_search answer that record a reason the answer leaves out; zero means each one carries it in `why`.