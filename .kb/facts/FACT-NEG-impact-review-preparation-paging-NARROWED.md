---
title: 'Failure side: every preparation page binds the whole captured scope'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: pages_unbound_from_whole_scope
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
id: FACT-NEG-impact-review-preparation-paging-NARROWED
type: fact
---
The failure side of REQ-impact-review-preparation-paging: given the same scope, a page whose fingerprint or file count describes only its own rows fails the preparation and result-budget tests' assertions.