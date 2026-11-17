---
title: kb_upsert writes into another entity's document
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: writes_into_other_entity_documents
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-E207DE33B530FD87
claim_text: kb_upsert must refuse to write an entity into an existing authored document that holds another entity, including a document without an id that the store does not read the written entity from
text_ref: REQ-kb-upsert-refuse-write-entity-into
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T18:15:03.863Z'
id: FACT-kb-upsert-other-entity-document-writes
type: fact
---
