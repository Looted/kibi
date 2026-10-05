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
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cb08e3d6074eeb00f1b14274
    test_id: TEST-skillopt-logical-evidence-fidelity
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 7994d48277cfa366e83d86434ab21765d293174e4562127c2bd19a3d4008c200
    binding_hash: a6e17a644e0c7513872ba7ee2148a8fa63c8c751b0a46b26909f362f050aa71b
    fingerprint: ab9033ffc207ca6fd8ec0c33c637a3da41214ad3aeeb439b72690ebe1a2a016d
    fingerprint_components:
      contract: 7994d48277cfa366e83d86434ab21765d293174e4562127c2bd19a3d4008c200
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
      - symbol_id: SYM-e2e-test-skillopt-logical-evidence-fidelity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies canonical strict-property targets, repeated relationship target decoding, explicit safe-mutation requests with real test evidence, exact safe-mutation final-state assertions, typed provider-budget exhaustion, structured feedback categories for behavioral misses, and partial semantic-advisor readiness until every atomic claim has a logical grounding slot.

Executable coverage spans `scripts/skillopt-eval/tests/evaluator-authority.test.ts`, `scripts/skillopt-eval/tests/default-cell-evidence.test.ts`, `scripts/skillopt-eval/tests/fixture-public.test.ts`, `scripts/skillopt-eval/tests/codex-episode-replay.test.ts`, `scripts/skillopt-eval/tests/bridge-cli.test.ts`, `packages/cli/tests/operations/semantic-advisor.test.ts`, and `packages/cli/tests/prolog/codec.test.ts`.
