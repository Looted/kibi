---
title: 'Failure side: kb_coverage plans are summaries by default'
status: active
fact_kind: property_value
subject_key: kibi.coverage.report
property_key: plans_default
operator: neq
value_type: string
value_string: summary
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-coverage-plan-summaries-FULL-PLANS
type: fact
---
The failure side of REQ-coverage-plan-summaries: given the same call, full plans returned without fields full fail the unit tests' assertions.