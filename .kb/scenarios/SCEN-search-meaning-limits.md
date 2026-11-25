---
title: Decision search keeps its recorded limits
status: active
priority: must
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:22.844Z'
id: SCEN-search-meaning-limits
type: scenario
---
Given Kibi's own knowledge base, when decision search runs, then it returns 5 cards by default, lists at most 7 decisions related by meaning, asks a provider to score at most 50000 entities, weighs the meaning ranking 0.5 against the word ranking and names a decision governing only from 0.5 coverage.