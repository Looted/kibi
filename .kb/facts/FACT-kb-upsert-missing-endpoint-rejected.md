---
title: When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: missing_endpoint_writes_reported_as_failures
operator: eq
value_type: int
value_int: 0
claim_text: When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target
claim_key: CLAIM-EDBBCF892763C13C
text_ref: REQ-kb-upsert-missing-endpoint-rejection
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kb-upsert-missing-endpoint-rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T13:33:58.690Z'
id: FACT-kb-upsert-missing-endpoint-rejected
type: fact
---
