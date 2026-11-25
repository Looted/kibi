---
title: A plain question answers with decision cards credited with their facts and symbols
status: active
priority: must
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:16.932Z'
id: SCEN-search-decisions-are-the-unit
type: scenario
---
Given requirements and ADRs whose facts and implementing symbols hold the question's words, when kb_search runs without a type filter, then it answers with decision cards ranked by those words, each with a deterministic score, its evidence and the file or symbol that links it, and with a type filter it returns rows of that type instead.