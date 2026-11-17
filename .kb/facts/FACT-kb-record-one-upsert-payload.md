---
title: kb_record writes exactly one kb_upsert payload
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: kb_upsert_payloads_per_record
operator: eq
value_type: int
value_int: 1
claim_key: CLAIM-723E6046F01283D2
claim_text: kb_record must translate its input into exactly one kb_upsert payload, never setting origin.approved_by, and must write only by running that payload through kb_upsert
text_ref: REQ-kb-record-upsert-equivalence
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - kb-record
origin:
  kind: agent
  recorded_at: '2026-11-17T06:41:47.398Z'
id: FACT-kb-record-one-upsert-payload
type: fact
---
