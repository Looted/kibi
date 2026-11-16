---
title: kb_upsert names the value fact that states the same quantity
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:56.801Z'
id: SCEN-upsert-names-quantity-twin
type: scenario
---
A kb_upsert of a value fact restating 500 under client.call_quota.window_cap returns a quantity-duplicate warning naming FACT-quota-ceiling and its key, and the same write after distinct_from returns none.