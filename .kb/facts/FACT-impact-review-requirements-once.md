---
title: Each scoped requirement is listed once per preparation
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: requirement_listings_per_preparation
operator: eq
value_type: int
value_int: 1
tags:
  - lane:strict
  - fact:property_value
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
claim_key: CLAIM-5EE7F6417FBF6EAE
claim_text: Kibi must list each requirement once per preparation, with its before and after fingerprints, instead of repeating its entity for each file
text_ref: REQ-impact-review-requirements-once
id: FACT-impact-review-requirements-once
type: fact
---
A preparation lists each scoped requirement exactly once, with its before and after fingerprints. Grounds the clause of REQ-impact-review-requirements-once.