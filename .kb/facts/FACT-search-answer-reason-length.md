---
title: A requirement's reason in the kb_search answer shall be at most 280 characters
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:21:00.543Z'
subject_key: kibi.search_answer.requirement_reasons
property_key: reason_text_max_chars
operator: lte
value_type: int
value_int: 280
claim_key: CLAIM-CE95957228E6BE42
claim_text: A requirement's reason in the kb_search answer shall be at most 280 characters
text_ref: REQ-search-answer-reason-length
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-search-answer-reason-length
distinct_from:
  - kibi.search.answer_limits.excerpt_chars
id: FACT-search-answer-reason-length
type: fact
---
The longest reason text, in characters, the answer gives for one governing requirement.

The reason length bounds a requirement's reason, a different text from an ADR decision excerpt. The code cuts both with the same excerpt limit today, and the arithmetic proof re-checks this bound against that limit, so a change to the limit is caught there.
