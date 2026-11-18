---
title: Facts sharing 0, 1 or a boolean are reported as one quantity
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:40.703Z'
subject_key: kibi.check.quantity_duplicate
property_key: trivial_values_compared
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-check-quantity-duplicate-trivial-values-TRIVIAL
type: fact
---
Two facts that both state zero failures, or both state true, are reported as one quantity although they say nothing alike.