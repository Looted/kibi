---
id: FACT-CHECK-ENFORCEMENT-GATE
title: Check Gate Enforcement Mode
status: active
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/facts/FACT-CHECK-ENFORCEMENT-GATE.md
tags: [validation, enforcement]
fact_kind: property_value
subject_key: kibi.check.enforcement
property_key: gate_mode
operator: eq
value_type: string
value_string: blocking
polarity: require
---

kibi check runs as a blocking gate; violations prevent commit merge.
