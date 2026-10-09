---
title: The kb_check operation must read an activated check policy as JSON data without importing plugin code
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-capability-check-policy
text_ref: REQ-capability-check-policy
fact_kind: property_value
subject_key: check_policy.evaluation
property_key: reads_policy_as_data
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-A2943DA31DDD9A0C
claim_text: The kb_check operation must read an activated check policy as JSON data without importing plugin code
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:12:44.917Z'
id: FACT-check-policy-reads-as-data
type: fact
---
The kb_check operation must read an activated check policy as JSON data without importing plugin code.

Recorded as a strict boolean semantic fact about `check_policy.evaluation` so REQ-capability-check-policy can be checked for contradictions.
