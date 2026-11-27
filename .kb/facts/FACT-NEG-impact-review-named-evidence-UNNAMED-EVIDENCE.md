---
title: 'Failure side: complete file evidence is returned only for named paths'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: unnamed_files_with_complete_evidence
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
id: FACT-NEG-impact-review-named-evidence-UNNAMED-EVIDENCE
type: fact
---
The failure side of REQ-impact-review-named-evidence: given the same scope, a preparation that returns complete evidence for a file the call did not name fails the preparation tests' assertions.