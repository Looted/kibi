---
title: 'A disabled-until sentence gets a guard predicate suggestion'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-advisor-predicate-rules
type: scenario
---
Given the sentence "Paid launches must stay disabled until the budget is approved.", when the packed CLI runs kibi semantic-advisor on it, then the receipt suggests a predicate fact named guard.

This is the success side of predicate rules. documentation/tests/e2e/packed/cli-strict-modeling-surface.test.ts, in its semantic advisor case, exercises it.
