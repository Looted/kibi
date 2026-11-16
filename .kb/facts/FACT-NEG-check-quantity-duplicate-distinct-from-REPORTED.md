---
title: A pair declared distinct is still reported
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:45.705Z'
subject_key: kibi.check.quantity_duplicate
property_key: declared_distinct_pairs_reported
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-check-quantity-duplicate-distinct-from-REPORTED
type: fact
---
A fact lists the other's key under distinct_from, and kibi check still reports the pair, so the only way out is to rename a key.