---
title: 'Failure side: a scoped requirement is missing from the preparation'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: requirement_listings_per_preparation
operator: lt
value_type: int
value_int: 1
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: FACT-NEG-impact-review-requirements-once-MISSING
type: fact
---
The failure side of REQ-impact-review-requirements-once: given the same scope, a preparation that leaves out a scoped requirement fails the preparation tests' assertions.