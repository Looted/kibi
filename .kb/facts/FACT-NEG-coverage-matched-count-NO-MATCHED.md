---
title: 'Failure side: kb_coverage reports its matched row count'
status: active
fact_kind: property_value
subject_key: kibi.coverage.report
property_key: reports_matched_count
operator: eq
value_type: bool
value_bool: false
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-coverage-matched-count-NO-MATCHED
type: fact
---
The failure side of REQ-coverage-matched-count: given the same page, a result without matched fails the unit tests' assertions.