---
title: A listing's rows are summaries by default
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: listing_rows_default
operator: eq
value_type: string
value_string: summary
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-A7AE6BF79B3CAA40
claim_text: kb_coverage, and kb_query without an id, must return summary rows unless the call passes fields full
text_ref: REQ-summary-rows-default
id: FACT-summary-rows-default
type: fact
---
kb_coverage and kb_query without an id list summary rows unless fields is full. Grounds the clause of REQ-summary-rows-default.