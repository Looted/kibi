---
id: FACT-CHECK-ENFORCEMENT-GATE
title: Check Gate Enforcement Mode
status: active
created_at: 2026-04-24T00:00:00.000Z
updated_at: 2026-04-24T00:00:00.000Z
source: documentation/facts/FACT-CHECK-ENFORCEMENT-GATE.md
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
---

kibi check runs as a blocking gate; violations prevent commit merge.
