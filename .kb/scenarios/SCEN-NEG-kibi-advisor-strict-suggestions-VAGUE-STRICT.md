---
title: 'Prose without a measurable value gets no strict suggestion'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-advisor-strict-suggestions-VAGUE-STRICT
type: scenario
---
Given the sentence "Session tokens should be handled carefully.", when the packed CLI runs kibi semantic-advisor on it, then the receipt carries no strict_property or predicate suggestion and reports the clause as an ontology gap.

This is the failure side of strict suggestions: the advisor never invents a value the prose does not state. documentation/tests/e2e/packed/cli-strict-modeling-surface.test.ts, in its semantic advisor case, exercises it.
