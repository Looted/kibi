---
title: kb_upsert must refuse a value fact write that makes two current requirements contradict
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:28.947Z'
subject_key: kibi.upsert.sibling_requirements
property_key: fact_writes_introducing_contradictions_accepted
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-E21924B8939F7A5F
claim_text: kb_upsert must refuse a value fact write that makes two current requirements contradict
text_ref: REQ-upsert-refuses-fact-contradiction
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-refuses-fact-contradiction
id: FACT-upsert-refuses-fact-contradiction
type: fact
---
Counts kb_upsert writes of a value fact that make two current requirements grounded on it contradict where they did not before and that are accepted; zero means each is refused with SEMANTIC_CONTRADICTION naming the pair.