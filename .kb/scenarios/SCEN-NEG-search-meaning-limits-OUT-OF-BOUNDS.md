---
title: Decision search limits outside the recorded values are refused
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:56.869Z'
id: SCEN-NEG-search-meaning-limits-OUT-OF-BOUNDS
type: scenario
---
Given a meaning list of 8 decisions, a request scoring 50001 entities, a meaning weight above 0.5, a default of 6 cards or a governing coverage below 0.5, when decision search runs with any of them, then it is refused.