---
title: 'Failure side: a repeated kb_coverage call reuses its report'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-coverage-report-reuse-RECOMPUTED
type: scenario
---
Given the same calls, a check time that differs between them, so the report is computed again, fails the unit tests' assertions.

## Context

The failure side of REQ-coverage-report-reuse.