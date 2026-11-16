---
title: kb_upsert must say that no reason is recorded when it creates or changes the statement or a grounded value of a human- or agent-authored requirement that has none
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T14:58:09.153Z'
subject_key: kibi.upsert.requirement_reason_notes
property_key: requirement_writes_without_reason_left_unnoted
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-20E5C5CB97A71CCE
claim_text: kb_upsert must say that no reason is recorded when it creates or changes the statement or a grounded value of a human- or agent-authored requirement that has none
text_ref: REQ-upsert-notes-missing-reason
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-upsert-notes-missing-reason
id: FACT-upsert-notes-missing-reason
type: fact
---
Counts kb_upsert writes that create a human- or agent-authored requirement, change its statement or change a value it is grounded on while it records no reason, and whose result does not say so; zero means each one carries the note.