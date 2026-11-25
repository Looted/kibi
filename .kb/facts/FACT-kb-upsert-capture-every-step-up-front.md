---
title: A requirement write lists the kb_model and pair-review steps up front
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: later_check_steps_missing_from_next_actions
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-580DB1193B4C8588
claim_text: When kb_upsert or kb_record writes a requirement with unmodeled claims, its nextActions must include a kb_model step for those claims and a pair-review step for each current requirement on its claims' subjects, at every level
text_ref: REQ-kb-upsert-capture-every-step-up-front
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kb-upsert-capture-every-step-up-front
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:25.584Z'
id: FACT-kb-upsert-capture-every-step-up-front
type: fact
---
When kb_upsert or kb_record writes a requirement with unmodeled claims, its nextActions include a kb_model step for those claims and a pair-review step for each current requirement on its claims' subjects, at every Kibi level: the number of those steps missing from nextActions is 0.
