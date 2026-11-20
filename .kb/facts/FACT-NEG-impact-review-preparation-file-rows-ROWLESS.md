---
title: 'Failure side: a preparation returns one row per captured file'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: captured_files_without_row
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: FACT-NEG-impact-review-preparation-file-rows-ROWLESS
type: fact
---
The failure side of REQ-impact-review-public-preparation: a preparation that leaves a captured file without its row fails the preparation tests' assertions.