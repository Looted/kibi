---
title: kb_upsert must quote the recorded reason when a write changes a grounded value and leaves the reason unchanged
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T14:58:11.962Z'
subject_key: kibi.upsert.requirement_reason_notes
property_key: grounded_value_changes_with_reason_left_unquoted
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-D0DB8015DCC18F0D
claim_text: kb_upsert must quote the recorded reason when a write changes a grounded value and leaves the reason unchanged
text_ref: REQ-upsert-quotes-older-reason
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-quotes-older-reason
id: FACT-upsert-quotes-older-reason
type: fact
---
Counts kb_upsert writes that change a value a recorded-reason requirement is grounded on and whose result does not quote that reason; zero means each one quotes it and asks whether it still holds.