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
    - symbol_id: SYM-e2e-ontology-convergence-witnesses
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d898ccced7cf16da46cc16e2
    test_id: TEST-skillopt-logical-evidence-fidelity
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9dc80cd46b88b3e9ed22847789728d45e26785679f583f7506342eeaba32e1c5
    binding_hash: 1164456a03c23aaede87aa0e06511aaaaf5a037733d3217bec232c8b5d1accf7
    fingerprint: 2c66693d839c50557df5751a7b39163dd45b64ff6aef181995fe671502ba6a1b
    fingerprint_components:
      contract: 9dc80cd46b88b3e9ed22847789728d45e26785679f583f7506342eeaba32e1c5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-ontology-convergence-witnesses
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies canonical strict-property targets, repeated relationship target decoding, explicit safe-mutation requests with real test evidence, exact safe-mutation final-state assertions, typed provider-budget exhaustion, structured feedback categories for behavioral misses, and partial semantic-advisor readiness until every atomic claim has a logical grounding slot.

Executable coverage spans `scripts/skillopt-eval/tests/evaluator-authority.test.ts`, `scripts/skillopt-eval/tests/default-cell-evidence.test.ts`, `scripts/skillopt-eval/tests/fixture-public.test.ts`, `scripts/skillopt-eval/tests/codex-episode-replay.test.ts`, `scripts/skillopt-eval/tests/bridge-cli.test.ts`, `packages/cli/tests/operations/semantic-advisor.test.ts`, and `packages/cli/tests/prolog/codec.test.ts`.
