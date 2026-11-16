---
title: Kibi check must not report identical value facts as one claim minted twice when their requirements are linked by restates or supersedes
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:52:41.796Z'
subject_key: kibi.check.duplicate_value_facts
property_key: restated_twins_reported_as_duplicates
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-C64EB569E862E357
claim_text: Kibi check must not report identical value facts as one claim minted twice when their requirements are linked by restates or supersedes
text_ref: REQ-check-restated-twin-facts
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-check-restated-twin-facts
id: FACT-check-restated-twin-facts
type: fact
---
Counts groups of identical value facts that kibi check reports as one claim minted twice although every pair is grounded by requirements linked by restates or supersedes; zero means none is.