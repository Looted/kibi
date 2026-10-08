---
title: Predicate closed vocabulary tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - vocabulary
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-closed-vocabularies
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:51.439Z'
id: TEST-model-predicates-closed-vocabularies
type: test
---
Runs `packages/cli/tests/operations/predicate-binding-placeholders.test.ts`, which validates every built-in schema vocabulary against `predicateVocabularyErrors` and the schema examples, checks the `allowedValues` and summary text of an unbound trigger, and binds constants named in other words or through an alias.