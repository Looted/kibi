---
title: kb_apply_plan must run the contradiction check once, after every step of the plan is staged
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:49.037Z'
subject_key: kibi.upsert.sibling_requirements
property_key: plans_refused_on_intermediate_contradictions
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-EEEEAB199692F8D8
claim_text: kb_apply_plan must run the contradiction check once, after every step of the plan is staged
text_ref: REQ-apply-plan-checks-contradictions-once
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-apply-plan-checks-contradictions-once
id: FACT-apply-plan-checks-contradictions-once
type: fact
---
Counts kb_apply_plan batches refused for a contradiction that holds after an intermediate step but not once every step is staged; zero means the check runs once after all steps.