---
title: kb_upsert writes an entity into another entity's document
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: writes_into_other_entity_documents
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:30.915Z'
id: FACT-NEG-kb-upsert-refuse-write-entity-into-VIOLATED
type: fact
---
kb_upsert writes the new entity into an existing authored document that already holds another entity.