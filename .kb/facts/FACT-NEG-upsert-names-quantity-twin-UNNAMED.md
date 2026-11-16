---
title: A write that restates a quantity under a new key says nothing
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:55.273Z'
subject_key: kibi.check.quantity_duplicate
property_key: quantity_twins_unnamed_on_write
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-upsert-names-quantity-twin-UNNAMED
type: fact
---
An agent writes a value fact that states an existing limit under a new key, and the result carries no warning, so the split is only found later by kibi check.