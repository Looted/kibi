---
title: Equal values in unrelated code are reported as one quantity
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:36.137Z'
subject_key: kibi.check.quantity_duplicate
property_key: unrelated_equal_values_paired
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-check-quantity-duplicate-pairing-COINCIDENCE
type: fact
---
Two value facts happen to share the number 5 but their requirements are implemented in different files with nothing else in common, and the check reports them as one quantity.