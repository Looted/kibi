---
title: 'Failure side: a listing''s rows are summaries by default'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: listing_rows_default
operator: neq
value_type: string
value_string: summary
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-summary-rows-default-FULL-BY-DEFAULT
type: fact
---
The failure side of REQ-summary-rows-default: given the same calls, full rows returned without fields full fail the unit tests' assertions.