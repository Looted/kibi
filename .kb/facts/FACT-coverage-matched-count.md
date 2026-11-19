---
title: kb_coverage reports its matched row count
status: active
fact_kind: property_value
subject_key: kibi.coverage.report
property_key: reports_matched_count
operator: eq
value_type: bool
value_bool: true
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-4A4D7DC83A23AECA
claim_text: kb_coverage must report the number of rows that match its filters
text_ref: REQ-coverage-matched-count
id: FACT-coverage-matched-count
type: fact
---
Every kb_coverage result carries matched, the number of rows its filters select before paging. Grounds the clause of REQ-coverage-matched-count.