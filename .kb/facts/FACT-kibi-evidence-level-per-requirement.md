---
title: 'Evidence levels: one level per requirement, never stronger than its evidence'
status: active
fact_kind: property_value
subject_key: kibi.evidence_levels
property_key: evidence_levels_reported_per_requirement
operator: eq
value_type: set
value_set:
  - proved
  - tested
  - asserted
  - unverified
claim_key: CLAIM-6A120A441BC6AD42
claim_text: Kibi coverage must report for each requirement an evidence level of proved, tested, asserted or unverified that is never stronger than the evidence behind it
text_ref: REQ-kibi-evidence-levels
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kibi-evidence-levels
origin:
  kind: agent
  recorded_at: '2026-10-23T12:06:44.417Z'
distinct_from:
  - kibi.evidence_levels.vocabulary.levels
id: FACT-kibi-evidence-level-per-requirement
type: fact
---
This is the set of levels coverage reports, which the exhaustive proof enumerates over the coverage code. It equals the level vocabulary by design, but it is a property of the coverage output, not the vocabulary itself.
