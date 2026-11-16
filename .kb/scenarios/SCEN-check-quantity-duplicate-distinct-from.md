---
title: distinct_from on a value fact exempts the pair it names
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:47.218Z'
id: SCEN-check-quantity-duplicate-distinct-from
type: scenario
---
After distinct_from on one fact names the other's subject_key.property_key, kibi check reports no quantity-duplicate finding for the pair and kb_upsert gives no warning.