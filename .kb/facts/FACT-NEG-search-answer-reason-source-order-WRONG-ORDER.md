---
title: A change note is preferred over the requirement's reason
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:58.524Z'
subject_key: kibi.search_answer.requirement_reasons
property_key: reason_source_order
operator: eq
value_type: string
value_string: why_this_changed,section,rationale,adr
tags:
  - negative-path
id: FACT-NEG-search-answer-reason-source-order-WRONG-ORDER
type: fact
---
A requirement has a Context section saying why the rule exists and a Why this changed section saying how it was split; the answer quotes the Why this changed section instead of the reason.