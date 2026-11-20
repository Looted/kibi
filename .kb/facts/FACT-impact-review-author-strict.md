---
title: No record failing strict validation is written
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: invalid_records_written
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
claim_key: CLAIM-0928FA5E01431358
claim_text: kb_author_impact_review must refuse a record that fails strict impact-review validation and leave the existing file unchanged
text_ref: REQ-impact-review-author-strict
id: FACT-impact-review-author-strict
type: fact
---
kb_author_impact_review never writes a record the strict impact-review validation rejects, and the existing file stays as it was. Grounds the clause of REQ-impact-review-author-strict.