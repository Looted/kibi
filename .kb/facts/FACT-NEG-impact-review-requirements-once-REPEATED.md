---
title: 'Failure side: each scoped requirement is listed once per preparation'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: requirement_listings_per_preparation
operator: gt
value_type: int
value_int: 1
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: FACT-NEG-impact-review-requirements-once-REPEATED
type: fact
---
The failure side of REQ-impact-review-requirements-once: given the same scope, a preparation that lists the requirement twice or repeats its entity per file fails the preparation tests' assertions.