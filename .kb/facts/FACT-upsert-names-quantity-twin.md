---
title: kb_upsert must name each existing value fact that states the same quantity as the value fact it writes
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:53.853Z'
subject_key: kibi.check.quantity_duplicate
property_key: quantity_twins_unnamed_on_write
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-74F1CBCBDD1B6E18
claim_text: kb_upsert must name each existing value fact that states the same quantity as the value fact it writes
text_ref: REQ-upsert-names-quantity-twin
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-names-quantity-twin
id: FACT-upsert-names-quantity-twin
type: fact
---
Counts kb_upsert writes of a value fact, or of a requirement grounding one, that state the quantity of an existing value fact under another key and whose result does not name that fact; zero means each write names it.