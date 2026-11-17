---
title: Each blocking step a requirement write leaves comes back as a nextActions entry
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: blocking_steps_left_as_warnings_only
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-E8337E63A8D7863F
claim_text: A requirement kb_upsert must return each step that kb_check would still block the requirement on and that the call could not complete (subjects for an unmodeled claim, a missing Context section, a test for its evidence floor or for an implementing symbol without coverage) as a nextActions entry that names the operation and carries a ready input, instead of a warning
text_ref: REQ-kb-upsert-capture-next-actions
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kb-upsert-capture-next-actions
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:15.437Z'
id: FACT-kb-upsert-capture-next-actions
type: fact
---
