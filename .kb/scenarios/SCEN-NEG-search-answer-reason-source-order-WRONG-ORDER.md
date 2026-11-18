---
title: A change note is preferred over the requirement's reason
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
A requirement has a Context section saying why the rule exists and a Why this changed section saying how it was split; the answer quotes the Why this changed section instead of the reason.

This is the failure side the answer must not produce; packages/cli/tests/search-answer.test.ts checks it.