---
title: Grounding guards and the committed claim key on the decision-conflict fixture
status: passing
priority: must
tags:
  - modeling
  - mutation
  - search-lane
text_ref: packages/cli/tests/consumer/predicate-grounding-guards.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-grounding-guards
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-12T18:55:06.595Z'
id: TEST-model-predicates-grounding-guards
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-691f9e12e7e594ff17024759
    test_id: TEST-model-predicates-grounding-guards
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1724d97ee24667a3103da9ec1518845ccdbf5ec0d234a0336d8a1c7e1c27b106
    binding_hash: c75f9af36b3325aa8f745978879164da435d1da7cb2f38206d4f037cc82e91de
    fingerprint: c97ba7e3efa1c7f5f685699f3821c9b5356bd4b61dbe29d7306fdc16e38f8baa
    fingerprint_components:
      contract: 1724d97ee24667a3103da9ec1518845ccdbf5ec0d234a0336d8a1c7e1c27b106
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
      - symbol_id: SYM-test-model-predicates-grounding-guards
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Consumer suite that runs the scenario end to end through the CLI against a real engine: canonical_key recognition with and without the decision bound, extend_requirement and decisionConflicts under the owning and another requirement, the multi-clause plan applied through kb_apply_plan, and claimKey on a committed fact write.