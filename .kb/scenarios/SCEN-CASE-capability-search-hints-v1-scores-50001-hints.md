---
title: A kibi.search-hints.v1 result of 50001 hints is rejected
status: active
priority: should
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:25:05.799Z'
id: SCEN-CASE-capability-search-hints-v1-scores-50001-hints
type: scenario
---
Given a search hints provider that returns 50001 hints for a request whose limit is 50000 or more, when the host validates the result, then it is rejected as over the cap.