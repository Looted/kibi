---
title: Two keys for one quantity pass the check
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:31.519Z'
subject_key: kibi.check.quantity_duplicate
property_key: quantity_duplicate_pairs_unreported
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-check-quantity-duplicate-UNREPORTED
type: fact
---
Two requirements ground the same limit under different keys, their code lives in one file, and kibi check passes, so a later change to one key leaves the other stale.