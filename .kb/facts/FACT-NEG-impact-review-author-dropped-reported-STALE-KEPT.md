---
title: 'Failure side: every dropped earlier decision is reported'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: dropped_decisions_unreported
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
id: FACT-NEG-impact-review-author-dropped-reported-STALE-KEPT
type: fact
---
The failure side of REQ-impact-review-author-carry: given the same changes, a kept decision for the changed file or a drop not named in the result fails the authoring tests' assertions.