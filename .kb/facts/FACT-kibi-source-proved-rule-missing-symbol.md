---
title: A rule every claim of which a source proof proves reports no missing production symbol
status: active
fact_kind: property_value
subject_key: kibi.proof.requirement
property_key: source_proved_unimplemented_requirements_missing_symbol
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
claim_key: CLAIM-96AD6117E2C946A9
claim_text: A requirement that no symbol implements must pass its production-symbol stage when a passing source proof proves every applicable claim
origin:
  kind: agent
  recorded_at: '2026-11-18T10:54:28.386Z'
id: FACT-kibi-source-proved-rule-missing-symbol
type: fact
---
Counts requirements that no symbol implements, each of whose applicable claims a passing source proof proves with a derived binding, that still fail the production-symbol stage or report missing_production_symbol; zero means none does.