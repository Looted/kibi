---
title: Complete file evidence is returned only for named paths
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: unnamed_files_with_complete_evidence
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
claim_key: CLAIM-1B678C1FBAF20CB4
claim_text: Kibi must return a file's complete evidence only for the paths the call names
text_ref: REQ-impact-review-named-evidence
id: FACT-impact-review-named-evidence
type: fact
---
A preparation returns no file's complete evidence unless the call names its path. Grounds the clause of REQ-impact-review-named-evidence.