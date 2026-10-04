---
id: FACT-CHECK-ENFORCEMENT-GATE
title: Check Gate Enforcement Mode
status: active
created_at: 2026-04-24T00:00:00.000Z
updated_at: 2026-04-24T00:00:00.000Z
tags:
  - validation
  - enforcement
fact_kind: property_value
subject_key: kibi.check.enforcement
property_key: gate_mode
operator: eq
value_type: string
value_string: blocking
polarity: require
claim_key: CLAIM-5126258C36C49A04
claim_text: The hook runs `kibi check` and blocks commits when must-priority coverage rules are violated
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

kibi check runs as a blocking gate; violations prevent commit merge.
