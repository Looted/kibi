---
title: A fact write that makes two requirements conflict is accepted
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:30.800Z'
subject_key: kibi.upsert.sibling_requirements
property_key: fact_writes_introducing_contradictions_accepted
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-upsert-refuses-fact-contradiction-ACCEPTED
type: fact
---
An agent moves a ceiling below another requirement's floor on the same quantity, and kb_upsert writes it, so the KB holds two requirements no value can satisfy.