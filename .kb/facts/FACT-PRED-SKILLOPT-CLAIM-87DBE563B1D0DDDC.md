---
title: 'SkillOpt evidence: exact entity query targets dropped for a repeated relationship type = 0'
status: active
fact_kind: property_value
subject_key: kibi.skillopt.logical_evidence
property_key: exact_query_targets_dropped_for_repeated_relationship_type
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-87DBE563B1D0DDDC
claim_text: Exact entity queries must preserve every target when a relationship type occurs more than once
id: FACT-PRED-SKILLOPT-CLAIM-87DBE563B1D0DDDC
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
case_waiver: 'No CLI path shows repeated relationship keys; the codec unit test that preserves every target of a repeated relationship covers it.'
case_waiver_approved_by: Piotr Franczyk
---
