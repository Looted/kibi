---
title: 'Prose that matches no predicate rule gets no predicate suggestion'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-advisor-predicate-rules-UNMATCHED-PREDICATE
type: scenario
---
Given the sentence "Session tokens should be handled carefully.", when the packed CLI runs kibi semantic-advisor on it, then the receipt carries no predicate suggestion and reports the clause as an ontology gap instead.

This is the failure side of predicate rules: a predicate is suggested only when a declared rule matches. documentation/tests/e2e/packed/cli-strict-modeling-surface.test.ts, in its semantic advisor case, exercises it.
