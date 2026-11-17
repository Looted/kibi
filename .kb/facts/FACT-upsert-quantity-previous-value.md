---
title: kb_upsert must compare a changed value fact by the value it held before the write
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:58.275Z'
subject_key: kibi.check.quantity_duplicate
property_key: stale_twins_unnamed_on_value_change
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-6C22696655D4CD14
claim_text: kb_upsert must compare a changed value fact by the value it held before the write
text_ref: REQ-upsert-quantity-previous-value
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-quantity-previous-value
id: FACT-upsert-quantity-previous-value
type: fact
---
Counts kb_upsert writes, dry runs included, that change a value fact's value away from a twin's value and whose result does not name the twin that still states the old value; zero means each names it.