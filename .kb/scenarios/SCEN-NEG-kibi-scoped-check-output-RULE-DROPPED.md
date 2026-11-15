---
title: A scoped kb_check cut to its budget keeps every blocking rule
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T18:44:59.596Z'
id: SCEN-NEG-kibi-scoped-check-output-RULE-DROPPED
type: scenario
---
Given a scoped kb_check whose blocking violations of several rules exceed the 24,000-character budget, when the result is cut, then the violations past the budget are grouped by rule with their count, so no blocking rule drops out of the result, and the result is marked truncated.

This is the failure side of the budget: a shorter result must still say every reason the check blocks. packages/cli/tests/public/operations/check-scope.test.ts exercises it.