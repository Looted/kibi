---
title: Every entity type accepts an optional origin
status: active
tags:
  - lane:ontology
  - origin
  - provenance
claim_key: CLAIM-7AC3394BD0DCD7A9
claim_text: Every entity type must accept an optional origin field with kind human, agent, migration, or import and optional ref, approved_by, and recorded_at fields
text_ref: .kb/requirements/REQ-kibi-entity-origin.md
fact_kind: property_value
subject_key: kibi.entity.origin
property_key: entity_types_accepting_optional_origin
operator: eq
value_type: set
value_set:
  - req
  - scenario
  - test
  - adr
  - flag
  - event
  - symbol
  - fact
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:21.188Z'
id: FACT-PRED-entity-origin-field
type: fact
---
