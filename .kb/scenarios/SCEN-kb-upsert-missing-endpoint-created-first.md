---
title: The same write succeeds once the missing entity is created first
status: active
expects: success
priority: must
tags:
  - mutation
  - relationships
origin:
  kind: agent
  recorded_at: '2026-11-16T13:38:44.033Z'
id: SCEN-kb-upsert-missing-endpoint-created-first
type: scenario
---
Given an upsert of SCEN-x linking to TEST-missing was refused because TEST-missing did not exist, when the agent follows the refusal and upserts TEST-missing first, then the same SCEN-x payload is written with its verified_by relationship and no further refusal.