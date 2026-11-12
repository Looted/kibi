---
title: A superseded requirement scoring exactly 0.8 of the best candidate still leads to its replacement
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:39:03.135Z'
id: SCEN-NEG-search-answer-replacement-STRONG-MATCH-DROPPED
type: scenario
---
Given a current requirement matched at 0.6 and a superseded requirement matched at exactly 0.48, 0.8 of that score, when kb_search builds its answer, the replacement of the superseded requirement is proposed as governing via `supersedes <old id>`, instead of being dropped as if the floor were higher. packages/cli/tests/search-answer.test.ts "a weak match on a superseded requirement does not pull its replacement in" pins both sides of the boundary.

This is the failure side of the replacement requirement: a floor set too high.