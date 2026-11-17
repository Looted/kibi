---
title: A kb_record that writes two kb_upsert payloads
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: kb_upsert_payloads_per_record
operator: eq
value_type: int
value_int: 2
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:41:51.256Z'
id: FACT-NEG-kb-record-one-upsert-payload-TWO-PAYLOADS
type: fact
---
A kb_record that wrote its requirement through two kb_upsert payloads, or through a write path of its own, could record what a single hand-written kb_upsert payload is refused for.
