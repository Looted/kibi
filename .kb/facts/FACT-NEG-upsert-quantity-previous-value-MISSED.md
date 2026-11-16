---
title: A value change leaves its twin stale without a word
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:59.738Z'
subject_key: kibi.check.quantity_duplicate
property_key: stale_twins_unnamed_on_value_change
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-upsert-quantity-previous-value-MISSED
type: fact
---
An agent changes a limit under one key from 500 to 400, the twin under another key still says 500, and the result says nothing because the new value no longer matches.