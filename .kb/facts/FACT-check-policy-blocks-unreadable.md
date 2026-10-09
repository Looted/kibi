---
title: The kb_check operation must block when an activated check policy cannot be read
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-capability-check-policy
text_ref: REQ-capability-check-policy
fact_kind: property_value
subject_key: check_policy.evaluation
property_key: blocks_unreadable_policy
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-0B667438D7DBFB61
claim_text: The kb_check operation must block when an activated check policy cannot be read
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:12:46.638Z'
id: FACT-check-policy-blocks-unreadable
type: fact
---
The kb_check operation must block when an activated check policy cannot be read.

Recorded as a strict boolean semantic fact about `check_policy.evaluation` so REQ-capability-check-policy can be checked for contradictions.
