---
title: No gating workflow lacks one aggregate required check
status: active
fact_kind: property_value
subject_key: kibi.ci.required_checks
property_key: gating_workflows_without_one_aggregate_check
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:08.000Z'
claim_key: CLAIM-EAB2D3A12E0E42FF
claim_text: Each CI workflow that gates develop reports one required check that passes only when every other job in that workflow succeeded
id: FACT-ci-required-check-aggregate
type: fact
---
Counts the workflows gating develop (ci.yml, proof.yml) that lack one aggregate job which needs every other job, always runs, and passes only when all of them succeeded; zero means each has one.