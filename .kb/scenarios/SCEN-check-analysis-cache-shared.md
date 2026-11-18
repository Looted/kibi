---
title: One kibi check keeps every source analysis it parsed in the branch analysis cache
status: active
expects: success
tags:
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
id: SCEN-check-analysis-cache-shared
type: scenario
---
Given a check run on an attached branch with symbol granularity and symbol debt enabled, the branch analysis cache is opened once, both steps receive that cache, and it is saved once after both have run.