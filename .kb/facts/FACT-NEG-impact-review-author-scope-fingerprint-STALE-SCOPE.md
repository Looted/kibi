---
title: 'Failure side: no record is written for a scope fingerprint other than the captured one'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: writes_with_mismatched_scope_fingerprint
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
id: FACT-NEG-impact-review-author-scope-fingerprint-STALE-SCOPE
type: fact
---
The failure side of REQ-impact-review-author-scope-fingerprint: given the same call, a record written for the mismatched fingerprint fails the authoring tests' assertions.