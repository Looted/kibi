---
title: 'Failure side: every operation declares how its result keeps to the budget'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-budget-declared-UNDECLARED
type: scenario
---
Given an operation added to the catalog without a declaration, the unit tests' assertions fail.

## Context

The failure side of REQ-result-budget-declared.