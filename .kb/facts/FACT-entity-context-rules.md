---
title: The entity context rules shall be entity-context-missing and entity-context-acknowledged
status: active
fact_kind: property_value
subject_key: kibi.entity_body.rules
claim_key: CLAIM-B3FD178F3940E1E5
claim_text: The entity context rules shall be entity-context-missing and entity-context-acknowledged
text_ref: REQ-kb-entity-context-rule-ids
property_key: context_rules
operator: eq
value_type: set
value_set:
  - entity-context-missing
  - entity-context-acknowledged
origin:
  kind: agent
  recorded_at: '2026-10-28T11:04:37.828Z'
id: FACT-entity-context-rules
type: fact
---
REQ-kb-entity-body-context reports missing context under its own kb_check rules, honors the review:context-missing tag for entities the schema 8 migration recorded, and arrived with KB schema 8. Each is stated here so it is proved against the constant.