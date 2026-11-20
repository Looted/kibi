---
title: A preparation carries no copy of the record schema
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: record_schema_copies_per_preparation
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
claim_key: CLAIM-26E246E380BF1B37
claim_text: Kibi must publish the impact-review record schema once, as a kibi-commit-review skill resource, instead of inside each preparation
text_ref: REQ-impact-review-schema-resource
id: FACT-impact-review-schema-resource
type: fact
---
No preparation embeds the impact-review record schema; it names the kibi-commit-review resource instead. Grounds the clause of REQ-impact-review-schema-resource.