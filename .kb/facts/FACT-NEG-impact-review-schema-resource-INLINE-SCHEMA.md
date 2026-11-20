---
title: 'Failure side: a preparation carries no copy of the record schema'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: record_schema_copies_per_preparation
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
id: FACT-NEG-impact-review-schema-resource-INLINE-SCHEMA
type: fact
---
The failure side of REQ-impact-review-schema-resource: given the same change, a preparation that embeds the schema, or a resource that differs from the shipped schema, fails the preparation tests' assertions.