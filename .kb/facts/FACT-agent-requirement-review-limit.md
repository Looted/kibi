---
title: The agent requirement review queue shall list at most 25 requirements
status: active
fact_kind: property_value
subject_key: kibi.origin.review_queue
claim_key: CLAIM-75316AACB6C1F49E
claim_text: The agent requirement review queue shall list at most 25 requirements
text_ref: REQ-kibi-agent-requirement-review-limit
property_key: agent_requirement_review_limit
operator: eq
value_type: int
value_int: 25
origin:
  kind: agent
  recorded_at: '2026-10-28T10:36:09.196Z'
id: FACT-agent-requirement-review-limit
type: fact
---
AGENT_REQUIREMENT_REVIEW_LIMIT in packages/cli/src/public/operations/origin-review.ts bounds the review queue REQ-kibi-entity-origin describes: kb_check lists that many agent-authored requirements without origin.approved_by by id, then one summary finding, so a large agent-authored KB yields a bounded queue. The bound is stated here so it is proved against the constant.