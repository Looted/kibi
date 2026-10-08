---
title: Predicate binding clause tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - bindings
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-binding-clauses
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:39.845Z'
id: TEST-model-predicates-binding-clauses
type: test
---
Runs the predicate binding placeholder suite, which models a claim whose actor is a seven-word clause and checks that the actor stays unbound with a hint, that a short noun still binds, and that explicit bindings and non-participant arguments are not judged by length.