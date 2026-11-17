---
title: Kibi check reports one quantity stated under two keys
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:33.078Z'
id: SCEN-check-quantity-duplicate
type: scenario
---
Two requirements implemented by one symbol in src/quota.ts ground the value 500 under client.call_quota.remaining and client.call_quota.window_cap, and kibi check reports one quantity-duplicate finding naming both facts, both keys and the file.