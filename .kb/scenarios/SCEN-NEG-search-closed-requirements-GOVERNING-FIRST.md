---
title: A kb_search answer lists a closed requirement after a current one reached as well, not first
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:38.271Z'
id: SCEN-NEG-search-closed-requirements-GOVERNING-FIRST
type: scenario
---
Given a closed requirement and a current requirement that both own matched entities with the same score, when kb_search builds its answer, the current requirement is listed first in governing and the closed one after it, still governing because closed is not retired. packages/cli/tests/search-answer.test.ts "a closed requirement reached through its fact ranks below a current one reached as well" pins the scores, and the consumer test above shows the order through the built CLI.

This is the failure side of the closed-requirement ranking requirement.