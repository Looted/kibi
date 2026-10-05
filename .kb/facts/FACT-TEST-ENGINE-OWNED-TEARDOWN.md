---
id: FACT-TEST-ENGINE-OWNED-TEARDOWN
title: Test engines use private durable teardown
status: active
created_at: 2026-08-12T00:00:00.000Z
updated_at: 2026-08-12T00:00:00.000Z
source: test/root.test.ts
tags:
  - lane:ontology
  - testing
  - engine
  - cleanup
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.testing.harness
  - runtime_ownership
  - private_and_durable_teardown
canonical_key: logical_requirement_rule(kibi.testing.harness,runtime_ownership,private_and_durable_teardown)
polarity: assert
claim_key: CLAIM-E29FB93757B5BA4B
claim_text: Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state
claim_span_start: 0
claim_span_end: 144
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of exact test-engine ownership and durable teardown.
