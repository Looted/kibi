---
title: A plan is refused for a contradiction between its own steps
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:51.114Z'
subject_key: kibi.upsert.sibling_requirements
property_key: plans_refused_on_intermediate_contradictions
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-apply-plan-checks-contradictions-once-INTERMEDIATE
type: fact
---
A plan moves a fact and then the fact of the requirement it conflicts with, and is refused after its first step although the finished plan is consistent.