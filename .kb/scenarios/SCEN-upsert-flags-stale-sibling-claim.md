---
title: kb_upsert flags a sibling whose claim still states the old value
status: active
priority: must
expects: success
tags:
  - upsert
  - sibling-requirements
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:42.457Z'
id: SCEN-upsert-flags-stale-sibling-claim
type: scenario
---
After client.call_quota.remaining moves from 500 to 400, the requirement whose claim says at most 500 is listed with statesOldValue true and its warning quotes the claim, while the floor requirement at 300 is not flagged.