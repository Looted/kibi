---
title: 'Failure side: no earlier decision is kept for a changed file or requirement'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: decisions_carried_for_changed_files
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
id: FACT-NEG-impact-review-author-carry-STALE-KEPT
type: fact
---
The failure side of REQ-impact-review-author-carry: given the same changes, a kept decision for the changed file or a drop not named in the result fails the authoring tests' assertions.