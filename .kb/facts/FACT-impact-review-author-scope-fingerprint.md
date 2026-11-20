---
title: No record is written for a scope fingerprint other than the captured one
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: writes_with_mismatched_scope_fingerprint
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
claim_key: CLAIM-33FBE1DBB977D859
claim_text: kb_author_impact_review must refuse when the staged scope's fingerprint differs from the fingerprint the call names
text_ref: REQ-impact-review-author-scope-fingerprint
id: FACT-impact-review-author-scope-fingerprint
type: fact
---
kb_author_impact_review writes nothing when the call's scope fingerprint is not the captured staged scope's. Grounds the clause of REQ-impact-review-author-scope-fingerprint.