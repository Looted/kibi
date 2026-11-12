---
title: A weak match on a superseded requirement leaves its replacement out of the answer
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:44.246Z'
id: SCEN-NEG-search-answer-replacement-WEAK-MATCH-PULLS
type: scenario
---
Given a current requirement that matches a query well and a superseded requirement that matches it weakly, when kb_search builds its answer, the superseded requirement is listed under notGoverning with supersededBy naming its replacement, and the replacement is not proposed as governing. packages/cli/tests/consumer/search-closed-requirements.test.ts "a weak match on a superseded requirement does not pull its replacement into the answer" exercises it through the built CLI, and packages/cli/tests/search-answer.test.ts pins the 0.8 boundary.

This is the failure side of the replacement requirement.