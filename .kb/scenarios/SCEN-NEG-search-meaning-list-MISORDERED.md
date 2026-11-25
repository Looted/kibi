---
title: A meaning list ordered by a decision's own text alone is refused
status: active
priority: should
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T20:05:28.318Z'
id: SCEN-NEG-search-meaning-list-MISORDERED
type: scenario
---
Given a decision whose linked scenario is closest in meaning to the question while its own title is not, when the meaning list orders decisions by their own text alone, then it is refused: each decision is ordered by the mean of its two best scores among its own text and the entities it links.