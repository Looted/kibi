---
title: At level test a write below its floor lists the failure-side scenario
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: failure_side_scenario_step_below_floor_at_test
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-3B61CEE66A4FD2A6
claim_text: When the requirement is below its evidence floor at level test, its nextActions must also include a failure-side scenario that the same test validates
text_ref: REQ-kb-upsert-capture-every-step-up-front
tags:
  - kb_upsert
  - next-actions
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:41:35.057Z'
id: FACT-kb-upsert-capture-failure-scenario-at-test
type: fact
---
At Kibi level test, a requirement write below its evidence floor lists a failure-side scenario that the same test validates among its nextActions.
