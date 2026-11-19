---
title: No earlier decision is kept for a changed file or requirement
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: decisions_carried_for_changed_files
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
claim_key: CLAIM-10FFD29200527740
claim_text: kb_author_impact_review must keep a previously authored decision only for a file whose evidence
text_ref: REQ-impact-review-author-carry
id: FACT-impact-review-author-carry
type: fact
---
A decision from the earlier record is kept only while the file's evidence and, when it names requirements, the knowledge fingerprint are unchanged. Grounds the clause of REQ-impact-review-author-carry.