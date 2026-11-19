---
title: A repeated coverage call recomputes nothing
status: active
fact_kind: property_value
subject_key: kibi.coverage.report
property_key: recomputations_on_unchanged_store
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-FC0CC3C697C9B42A
claim_text: A repeated kb_coverage call on an unchanged store must not recompute the report
text_ref: REQ-coverage-report-reuse
id: FACT-coverage-report-reuse
type: fact
---
Repeated kb_coverage calls on an unchanged store within the time window share one computed report. Grounds the clause of REQ-coverage-report-reuse.