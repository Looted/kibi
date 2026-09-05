---
id: TEST-skillopt-logical-evidence-fidelity
title: Skillopt logical evidence fidelity regressions
status: passing
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: scripts/skillopt-eval/tests/default-cell-evidence.test.ts
tags:
  - skillopt
  - evaluation
  - predicates
  - unit
  - integration
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-logical-evidence-fidelity
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-logical-evidence-fidelity
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies canonical strict-property targets, repeated relationship target decoding, explicit safe-mutation requests with real test evidence, exact safe-mutation final-state assertions, typed provider-budget exhaustion, structured feedback categories for behavioral misses, and partial semantic-advisor readiness until every atomic claim has a logical grounding slot.

Executable coverage spans `scripts/skillopt-eval/tests/evaluator-authority.test.ts`, `scripts/skillopt-eval/tests/default-cell-evidence.test.ts`, `scripts/skillopt-eval/tests/fixture-public.test.ts`, `scripts/skillopt-eval/tests/codex-episode-replay.test.ts`, `scripts/skillopt-eval/tests/bridge-cli.test.ts`, `packages/cli/tests/operations/semantic-advisor.test.ts`, and `packages/cli/tests/prolog/codec.test.ts`.
