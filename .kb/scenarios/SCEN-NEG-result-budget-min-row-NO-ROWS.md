---
title: 'Failure side: a cut list result returns at least one row'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-budget-min-row-NO-ROWS
type: scenario
---
Given the same list, a cut result with no rows fails the unit tests' assertions.

## Context

The failure side of REQ-result-budget-min-row.