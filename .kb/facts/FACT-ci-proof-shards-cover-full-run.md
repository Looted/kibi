---
title: The proof workflow accepts no contracted test without a shard receipt
status: active
fact_kind: property_value
subject_key: kibi.ci.proof_shards
property_key: contracted_tests_accepted_without_a_shard_receipt
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:52.646Z'
id: FACT-ci-proof-shards-cover-full-run
type: fact
claim_key: CLAIM-2CC1F9E506919B60
claim_text: The proof workflow fails unless every contracted test has a receipt written on the proven snapshot by one of its shards
---
Counts the contracted tests that the proof workflow's join accepts without a passed receipt that one of its shards wrote on the proven snapshot; zero means the workflow fails unless every contracted test has one.