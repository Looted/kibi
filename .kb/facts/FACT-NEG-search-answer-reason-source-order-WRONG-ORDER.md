---
title: A requirement's older reason is preferred over the current one
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:58.524Z'
subject_key: kibi.search_answer.requirement_reasons
property_key: reason_source_order
operator: eq
value_type: string
value_string: section,why_this_changed,rationale,adr
tags:
  - negative-path
id: FACT-NEG-search-answer-reason-source-order-WRONG-ORDER
type: fact
---
A superseding requirement has a Why section copied from its predecessor and a Why this changed section; the answer quotes the copied reason instead of why it changed.