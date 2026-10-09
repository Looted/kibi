---
title: Gap and type coverage reports must not count a provenance stub as a fact
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-bootstrap-provenance-stubs
text_ref: REQ-bootstrap-provenance-stubs
fact_kind: property_value
subject_key: bootstrap.provenance_stubs
property_key: gap_and_coverage_reports_exclude_stubs
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-4F8F36FB72DB3453
claim_text: Gap and type coverage reports must not count a provenance stub as a fact
origin:
  kind: agent
  recorded_at: '2026-10-09T07:20:01.936Z'
id: FACT-bootstrap-provenance-stubs-not-counted
type: fact
---
Gap and type coverage reports must not count a provenance stub as a fact.

Recorded as a strict boolean semantic fact about `bootstrap.provenance_stubs` so REQ-bootstrap-provenance-stubs can be checked for contradictions.
