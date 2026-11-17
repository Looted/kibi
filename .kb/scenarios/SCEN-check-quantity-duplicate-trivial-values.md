---
title: The quantity check skips booleans, strings, 0 and 1
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:42.239Z'
id: SCEN-check-quantity-duplicate-trivial-values
type: scenario
---
Value facts that share a boolean, a string, 0 or 1 under different keys in one file are never reported, while facts that share 500 there are.