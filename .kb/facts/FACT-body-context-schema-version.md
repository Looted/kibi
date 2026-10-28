---
title: The entity body context check shall start at KB schema version 8
status: active
fact_kind: property_value
subject_key: kibi.entity_body.rules
claim_key: CLAIM-B32EB4E2784C2804
claim_text: The entity body context check shall start at KB schema version 8
text_ref: REQ-kb-entity-context-rule-ids
property_key: context_schema_version
operator: eq
value_type: int
value_int: 8
origin:
  kind: agent
  recorded_at: '2026-10-28T11:04:39.447Z'
id: FACT-body-context-schema-version
type: fact
---
REQ-kb-entity-body-context reports missing context under its own kb_check rules, honors the review:context-missing tag for entities the schema 8 migration recorded, and arrived with KB schema 8. Each is stated here so it is proved against the constant.