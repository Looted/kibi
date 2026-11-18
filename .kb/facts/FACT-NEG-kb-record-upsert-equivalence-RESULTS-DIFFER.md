---
title: A kb_record whose result differs from kb_upsert then the changed check
status: active
fact_kind: property_value
subject_key: kibi.kb_record
property_key: record_results_unlike_upsert_then_changed_check
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:10.946Z'
id: FACT-NEG-kb-record-upsert-equivalence-RESULTS-DIFFER
type: fact
---
A kb_record whose entities, relationships or verdict differed from kb_upsert of its payload followed by kb_check changed:true would be a second write path with rules of its own.
