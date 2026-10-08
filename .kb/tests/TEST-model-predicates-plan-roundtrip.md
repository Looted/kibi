---
title: Predicate plan round-trip tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - mcp
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-plan-roundtrip
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T08:33:07.281Z'
id: TEST-model-predicates-plan-roundtrip
type: test
---
Runs `packages/mcp/tests/predicate-plan-roundtrip.test.ts`, which starts the real kibi-mcp server over stdio in a fresh workspace, grounds two requirements through the strict lane, and applies the `record_ontology_gap` observation and the `replace_grounding` steps from `kb_model` mode `predicates` with `kb_upsert` and `kb_delete` exactly as returned, checking `kb_check` after every step; and `packages/cli/tests/operations/review-observation-plans.test.ts` and `packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts`, which check the plan shapes.