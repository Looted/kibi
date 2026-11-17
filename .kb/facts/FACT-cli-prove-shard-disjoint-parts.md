---
title: No selected test is outside exactly one shard part
status: active
fact_kind: property_value
subject_key: kibi.cli.prove_shard
property_key: selected_tests_not_in_exactly_one_shard_part
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:49.843Z'
id: FACT-cli-prove-shard-disjoint-parts
type: fact
claim_key: CLAIM-6EAFE06E09B334EC
claim_text: kibi prove --shard K/N runs only the K-th of N disjoint parts of the selected tests, so every selected test runs in exactly one part
---
Counts the tests a selector picked that are in no part, or in more than one part, of `kibi prove --shard 1/N` to `N/N`; zero means every selected test runs in exactly one part.