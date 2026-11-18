---
title: The proof workflow accepts a contracted test no shard proved
status: active
fact_kind: property_value
subject_key: kibi.ci.proof_shards
property_key: contracted_tests_accepted_without_a_shard_receipt
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:20.276Z'
id: FACT-NEG-ci-proof-shards-cover-full-run-VIOLATED
type: fact
---
One contracted test is selected by no shard, has no passed result in its shard, or its receipt comes from outside its shard, and the join still passes.