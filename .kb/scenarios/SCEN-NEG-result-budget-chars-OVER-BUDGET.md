---
title: 'Failure side: an operation result keeps its data within 24,000 characters'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-budget-chars-OVER-BUDGET
type: scenario
---
Given the same call, a result whose data is larger than 24,000 characters fails the unit and parity tests' assertions.

## Context

The failure side of REQ-result-budget-chars.