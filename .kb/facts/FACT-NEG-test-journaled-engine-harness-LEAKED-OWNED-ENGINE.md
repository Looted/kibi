---
title: A test spawns a detached engine process and exits without stopping it
status: active
fact_kind: predicate
polarity: deny
predicate_args:
  - kibi.testing.harness
  - runtime_ownership
  - private_and_durable_teardown
predicate_name: logical_requirement_rule
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.testing.harness,runtime_ownership,private_and_durable_teardown)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:08.051Z'
id: FACT-NEG-test-journaled-engine-harness-LEAKED-OWNED-ENGINE
type: fact
---
