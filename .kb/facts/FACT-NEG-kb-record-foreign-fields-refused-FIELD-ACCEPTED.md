---
title: A kb_record that accepts a field of kb_upsert
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: foreign_input_fields_accepted
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:02.332Z'
id: FACT-NEG-kb-record-foreign-fields-refused-FIELD-ACCEPTED
type: fact
---
A kb_record that accepted or silently dropped a field other than its own, such as facts or relationships, would hide that the modeling was never written.
