---
title: kb_upsert compares a changed value fact by its previous value
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:00.998Z'
id: SCEN-upsert-quantity-previous-value
type: scenario
---
A kb_upsert dry run moving client.call_quota.window_cap from 500 to 400 returns a warning that the fact held 500 before the write, the value FACT-quota-ceiling still states, and writes nothing.