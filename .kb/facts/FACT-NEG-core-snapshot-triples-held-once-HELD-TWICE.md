---
title: A snapshot that holds a triple twice
status: active
fact_kind: property_value
subject_key: kibi.engine.journal
property_key: snapshot_triples_held_twice
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-11-17T09:07:51.984Z'
tags:
  - negative-path
id: FACT-NEG-core-snapshot-triples-held-once-HELD-TWICE
type: fact
---
A snapshot written while rdf_db still held a reindexed triple that its garbage collector had not reclaimed holds that triple twice, and every later load answers it twice through rdf/4.