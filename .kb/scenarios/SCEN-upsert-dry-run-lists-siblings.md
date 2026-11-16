---
title: A kb_upsert dry run lists the same sibling requirements
status: active
priority: must
expects: success
tags:
  - upsert
  - sibling-requirements
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:47.561Z'
id: SCEN-upsert-dry-run-lists-siblings
type: scenario
---
A dry run moving client.call_quota.remaining from 500 to 400 returns the two siblings and their next actions, and the stored value is still 500 afterwards.