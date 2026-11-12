---
title: The proof producer must not start a step of a proof contract while an earlier step of that contract is still running
status: active
text_ref: REQ-proof-step-order
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-proof-step-order
fact_kind: property_value
subject_key: kibi.proof.producers
property_key: starts_step_before_earlier_steps_finish
operator: eq
value_type: bool
value_bool: false
claim_key: CLAIM-6A164EB7D3C45EC9
claim_text: The proof producer must not start a step of a proof contract while an earlier step of that contract is still running
origin:
  kind: agent
  recorded_at: '2026-11-12T16:06:12.621Z'
id: FACT-proof-step-order-earlier-steps-finish
type: fact
---
