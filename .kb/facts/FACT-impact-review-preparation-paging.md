---
title: Every preparation page binds the whole captured scope
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: pages_unbound_from_whole_scope
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
claim_key: CLAIM-AA59E5E23F4284B6
claim_text: Every page must carry the whole scope's fingerprint and file count, and neither paging nor named paths may narrow the captured inventory
text_ref: REQ-impact-review-preparation-paging
id: FACT-impact-review-preparation-paging
type: fact
---
Each page of a preparation carries recordHeaders.scope.fingerprint and fileCount for the whole captured scope, and neither offset nor paths removes a file from the captured inventory that fingerprint binds. Grounds the clause of REQ-impact-review-preparation-paging.