---
title: The upgrade turns the rule on without listing the pairs
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:03.972Z'
subject_key: kibi.check.quantity_duplicate
property_key: quantity_duplicate_pairs_unlisted
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-migrate-quantity-duplicate-review-UNLISTED
type: fact
---
A KB moves to schema 19 and kibi check starts blocking pairs that kibi migrate never listed, so the person meets them as failures instead of a review list.