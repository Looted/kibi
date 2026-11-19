---
title: 'Failure side: kb_coverage reports how many rows match its filters'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-coverage-matched-count-NO-MATCHED
type: scenario
---
Given the same page, a result without matched fails the unit tests' assertions.

## Context

The failure side of REQ-coverage-matched-count.