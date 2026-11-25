---
title: A requirement write lists every later kb_check step up front
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: later_check_steps_missing_from_next_actions
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-0FAE8DE1666484D6
claim_text: When kb_upsert or kb_record writes a requirement below its evidence floor, its nextActions must also include a pair-review step for each current requirement on its claims' subjects, a kb_model step for its unmodeled claims, and a failure-side scenario that the same test validates
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
