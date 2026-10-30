---
title: A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-model-predicates-replacement-diagnostics
text_ref: REQ-model-predicates-replacement-diagnostics
fact_kind: property_value
subject_key: kibi.predicate_suggestion.plan
property_key: expected_transient_findings
operator: eq
value_type: set
value_set:
  - logic-coverage
  - strict-req-fact-pairing
claim_key: CLAIM-433E11881CA6CC7A
claim_text: A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link
origin:
  kind: agent
  recorded_at: '2026-10-09T07:20:20.134Z'
id: FACT-model-predicates-replacement-diagnostics-expected
type: fact
case_waiver: 'Plan output; the round-trip test compares the plan with live kb_check and fails on an extra finding.'
case_waiver_approved_by: Piotr Franczyk
---
A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link.

Recorded as a typed semantic fact about `kibi.predicate_suggestion.plan` so REQ-model-predicates-replacement-diagnostics can be checked for contradictions.
