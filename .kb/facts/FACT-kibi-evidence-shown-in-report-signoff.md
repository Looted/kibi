---
title: 'Evidence levels: shown in the report and signoff'
status: active
fact_kind: property_value
subject_key: kibi.evidence_levels
property_key: evidence_levels_shown_in_report_and_signoff
operator: eq
value_type: set
value_set:
  - proved
  - tested
  - asserted
  - unverified
claim_key: CLAIM-22E34F860C144AB0
claim_text: Kibi report and kibi signoff must show the evidence level of each requirement
text_ref: REQ-kibi-evidence-levels
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kibi-evidence-levels
origin:
  kind: agent
  recorded_at: '2026-10-23T12:06:49.148Z'
distinct_from:
  - kibi.evidence_levels.vocabulary.levels
  - kibi.evidence_floor.evidence_levels_failed_below_floor
id: FACT-kibi-evidence-shown-in-report-signoff
type: fact
---
This is the set of levels kibi report and kibi signoff can show, which the exhaustive proof enumerates over the report code. It equals the level vocabulary, and the set of levels the floor check can fail, by design, but each set belongs to a different output.
