---
title: A preparation returns one row per captured file
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: captured_files_without_row
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
claim_key: CLAIM-E0B55B96C5D5CE1C
claim_text: Kibi must return the captured inventory, snapshot, trusted base policy, provider and evaluator bindings and residual review obligations, plus a row per file with its status, disposition, analysis status, requirement ids and pending obligations
text_ref: REQ-impact-review-public-preparation
id: FACT-impact-review-preparation-file-rows
type: fact
---
Every captured file has a row with its status, disposition, analysis status, requirement ids and pending obligations, next to the inventory's snapshot, bindings and residual obligations. Grounds the clause of REQ-impact-review-public-preparation.