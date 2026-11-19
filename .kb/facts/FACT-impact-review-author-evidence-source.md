---
title: The written record's evidence is what Kibi captured
status: active
fact_kind: property_value
subject_key: kibi.impact_review.authoring
property_key: record_evidence_source
operator: eq
value_type: string
value_string: kibi_capture
tags:
  - lane:strict
  - fact:property_value
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
claim_key: CLAIM-96D2449D3AE73965
claim_text: kb_author_impact_review must write .kibi/impact-review.json from the reviewer's per-file decisions and analysis reviews, reviewer id and review time, combined with the evidence Kibi captures itself
text_ref: REQ-impact-review-author-write
id: FACT-impact-review-author-evidence-source
type: fact
---
Every file entry of the record kb_author_impact_review writes carries the evidence Kibi captured, never evidence the caller sent. Grounds the clause of REQ-impact-review-author-write.