---
title: A governing requirement with a Why section reaches the answer without it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:54.335Z'
id: SCEN-NEG-search-answer-gives-recorded-reason-OMITTED
type: scenario
---
A requirement whose document has a Why section is listed as governing, but its entry carries no reason, so the agent asked why must make a second call or answer from memory.

This is the failure side the answer must not produce; packages/cli/tests/search-answer.test.ts checks it.