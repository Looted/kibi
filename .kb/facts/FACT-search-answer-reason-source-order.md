---
title: The kb_search answer must take a requirement's reason from its rationale field, then its Why this changed section, then its Why, Rationale or Context section, then its linked ADR
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:57.860Z'
subject_key: kibi.search_answer.requirement_reasons
property_key: reason_source_order
operator: eq
value_type: string
value_string: rationale,why_this_changed,section,adr
claim_key: CLAIM-965B97A9CEFFB691
claim_text: The kb_search answer must take a requirement's reason from its rationale field, then its Why this changed section, then its Why, Rationale or Context section, then its linked ADR
text_ref: REQ-search-answer-reason-source-order
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-search-answer-reason-source-order
id: FACT-search-answer-reason-source-order
type: fact
---
The order in which the answer reads a requirement's records for its reason, as the `from` values it reports.