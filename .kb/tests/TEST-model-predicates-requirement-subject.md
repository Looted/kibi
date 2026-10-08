---
title: Predicate requirement subject tests
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
    - symbol_id: SYM-test-model-predicates-requirement-subject
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:40.057Z'
id: TEST-model-predicates-requirement-subject
type: test
---
Runs `packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts`, which answers the requirement's `constrains` lookup from a stubbed KB and checks the bound subject, its provenance, the plan's `predicate_args`, the `subjectHint` override, the unbound subject without a subject fact and the binding examples for several subject facts, and the MCP stdio round trip that checks the applied predicate's first argument.