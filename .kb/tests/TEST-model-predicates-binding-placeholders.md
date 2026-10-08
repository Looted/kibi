---
title: Predicate binding placeholder tests
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
    - symbol_id: SYM-test-model-predicates-binding-placeholders
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T08:34:19.967Z'
id: TEST-model-predicates-binding-placeholders
type: test
---
Runs `packages/cli/tests/operations/predicate-binding-placeholders.test.ts`, which classifies bindings that repeat their own or another argument name, stop words, booleans and declared constants, runs predicate suggestion with schema-named and with claim-derived bindings, and checks the `bindingHints` shape and summary text.