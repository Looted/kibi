---
title: The minimum contradiction review candidate score shall be 0.1
status: active
fact_kind: property_value
subject_key: kibi.contradiction_review.limits
claim_key: CLAIM-9C053936BB885A8E
claim_text: The minimum contradiction review candidate score shall be 0.1
text_ref: REQ-kibi-contradiction-review-limits
property_key: min_candidate_score
operator: eq
value_type: number
value_number: 0.1
origin:
  kind: agent
  recorded_at: '2026-10-28T10:42:58.455Z'
id: FACT-review-candidate-min-score
type: fact
---
packages/cli/src/operations/planning/conflict-review.ts bounds the review candidates REQ-kibi-contradiction-review-candidates describes: a candidate needs at least the minimum score and the list is cut at the maximum count. Both are stated here so they are proved against the constants.