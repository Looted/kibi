---
title: 'Failure side: a repeated coverage call recomputes nothing'
status: active
fact_kind: property_value
subject_key: kibi.coverage.report
property_key: recomputations_on_unchanged_store
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-coverage-report-reuse-RECOMPUTED
type: fact
---
The failure side of REQ-coverage-report-reuse: given the same calls, a check time that differs between them, so the report is computed again, fails the unit tests' assertions.