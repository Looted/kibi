---
title: 'Failure side: a row larger than the budget is cut and names what it left out'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-budget-row-cut-UNCUT-ROW
type: scenario
---
Given the same row, a result that returns it uncut, drops it, or omits parts without naming them fails the unit tests' assertions.

## Context

The failure side of REQ-result-budget-row-cut.