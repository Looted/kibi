---
title: Contradiction review shall list at most 5 candidates
status: active
fact_kind: property_value
subject_key: kibi.contradiction_review.limits
claim_key: CLAIM-2CA8BAB8AAE97CF4
claim_text: Contradiction review shall list at most 5 candidates
text_ref: REQ-kibi-contradiction-review-limits
property_key: max_candidates
operator: eq
value_type: int
value_int: 5
origin:
  kind: agent
  recorded_at: '2026-10-28T10:42:59.294Z'
id: FACT-max-review-candidates
type: fact
---
packages/cli/src/operations/planning/conflict-review.ts bounds the review candidates REQ-kibi-contradiction-review-candidates describes: a candidate needs at least the minimum score and the list is cut at the maximum count. Both are stated here so they are proved against the constants.