---
title: Each audit log entry includes a timestamp, the operation type and the affected entity data
status: active
fact_kind: property_value
subject_key: kibi.audit.log
property_key: audit_entry_fields
operator: includes
value_type: set
value_set:
  - timestamp
  - operation_type
  - affected_entity_data
claim_key: CLAIM-33C75F0D3C7CEFB9
claim_text: Each audit log entry includes a timestamp, the operation type, and the affected entity data
tags:
  - lane:ontology
  - requirements
id: FACT-core-audit-logging-7CEFB9
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
