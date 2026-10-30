---
title: The bootstrap planner must select provenance stubs after every discovered candidate that states a claim
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-bootstrap-provenance-stubs
text_ref: REQ-bootstrap-provenance-stubs
fact_kind: property_value
subject_key: bootstrap.provenance_stubs
property_key: provenance_stubs_selected_before_claim_candidates
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-DF00F8E42E49F51E
claim_text: The bootstrap planner must select provenance stubs after every discovered candidate that states a claim
origin:
  kind: agent
  recorded_at: '2026-10-09T07:19:48.386Z'
id: FACT-bootstrap-provenance-stubs-selected-last
type: fact
---
The bootstrap planner must select provenance stubs after every discovered candidate that states a claim.

Recorded as a strict count fact about `bootstrap.provenance_stubs` so REQ-bootstrap-provenance-stubs can be checked for contradictions.
