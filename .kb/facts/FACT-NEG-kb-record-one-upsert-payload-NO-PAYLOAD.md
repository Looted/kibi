---
title: A kb_record that writes without a kb_upsert payload
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: kb_upsert_payloads_per_record
operator: eq
value_type: int
value_int: 0
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:07.783Z'
id: FACT-NEG-kb-record-one-upsert-payload-NO-PAYLOAD
type: fact
---
A kb_record that wrote its requirement without any kb_upsert payload would bypass the checks every hand-written write goes through.
