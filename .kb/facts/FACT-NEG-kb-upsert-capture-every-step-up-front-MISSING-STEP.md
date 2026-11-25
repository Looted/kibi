---
title: 'Forbidden: later check steps missing from next actions'
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: later_check_steps_missing_from_next_actions
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:28.045Z'
id: FACT-NEG-kb-upsert-capture-every-step-up-front-MISSING-STEP
type: fact
---
A requirement write that leaves a later kb_check step out of nextActions turns each check result into another round with the person.
