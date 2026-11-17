---
title: A distinct_from entry naming nothing passes the check
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:50.365Z'
subject_key: kibi.check.quantity_duplicate
property_key: dangling_distinct_from_entries_unreported
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-check-quantity-duplicate-dangling-distinct-UNREPORTED
type: fact
---
A value fact keeps a distinct_from entry for a key no fact uses any more, and kibi check says nothing about it.