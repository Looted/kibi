---
title: A kb_record field refusal that does not name kb_upsert
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: field_refusals_not_naming_kb_upsert
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:14.614Z'
id: FACT-NEG-kb-record-refusal-names-upsert-NO-POINTER
type: fact
---
A refusal that named the field but not kb_upsert would leave the agent without the call that records facts and other modeling.
