---
title: A fresh load of a branch store holds no triple twice
status: active
fact_kind: property_value
subject_key: kibi.engine.journal
property_key: snapshot_triples_held_twice
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-11-17T09:07:50.504Z'
claim_text: Every branch store snapshot Kibi writes must hold each triple once, so that a fresh load of the store (snapshot and journal) answers each triple once through rdf/4 as well as rdf/3
text_ref: REQ-core-snapshot-triples-held-once
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-core-snapshot-triples-held-once
claim_key: CLAIM-02AAD89F317F2EAC
id: FACT-core-snapshot-triples-held-once
type: fact
---
A branch store snapshot written by Kibi, loaded fresh with its journal, holds no triple more than once: rdf/4 counts the same triples as rdf/3.