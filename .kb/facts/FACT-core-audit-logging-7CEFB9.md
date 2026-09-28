---
title: Each audit log entry includes a timestamp, the operation type, and the
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.audit.log
  - entry_fields
  - timestamp_operation_affected_data
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.audit.log,entry_fields,timestamp_operation_affected_data)
polarity: assert
claim_key: CLAIM-33C75F0D3C7CEFB9
claim_text: Each audit log entry includes a timestamp, the operation type, and the affected entity data
tags:
  - lane:ontology
  - requirements
id: FACT-core-audit-logging-7CEFB9
type: fact
---
