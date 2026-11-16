---
title: A requirement's older reason is preferred over the current one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:59.858Z'
id: SCEN-NEG-search-answer-reason-source-order-WRONG-ORDER
type: scenario
---
A superseding requirement has a Why section copied from its predecessor and a Why this changed section; the answer quotes the copied reason instead of why it changed.

This is the failure side the answer must not produce; packages/cli/tests/search-answer.test.ts checks it.