---
title: Entity records require id, type, title, status, created_at, updated_at and source
status: active
fact_kind: property_value
subject_key: kibi.schema.entity_model
property_key: required_entity_fields
operator: eq
value_type: set
value_set:
  - created_at
  - id
  - source
  - status
  - title
  - type
  - updated_at
claim_text: Every entity record requires the fields id, type, title, status, created_at, updated_at and source
text_ref: REQ-004
origin:
  kind: agent
  recorded_at: '2026-10-27T07:16:31.999Z'
claim_key: CLAIM-B65B400C4EE4B605
id: FACT-entity-record-required-fields
type: fact
---
The entity schema lists exactly these fields as required on every entity record, so a record without one of them is rejected before it is stored.