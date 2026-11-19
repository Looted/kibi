---
title: 'Failure side: no record failing strict validation is written'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: invalid_records_written
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
id: FACT-NEG-impact-review-author-strict-INVALID-WRITTEN
type: fact
---
The failure side of REQ-impact-review-author-strict: given the same calls, a changed or overwritten record fails the authoring tests' assertions.