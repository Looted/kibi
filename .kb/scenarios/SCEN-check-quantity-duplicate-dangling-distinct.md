---
title: Kibi check reports a distinct_from entry that names no value fact
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:51.835Z'
id: SCEN-check-quantity-duplicate-dangling-distinct
type: scenario
---
A distinct_from entry naming client.call_quota.gone, which no active value fact uses, is reported as a quantity-duplicate finding on its fact.