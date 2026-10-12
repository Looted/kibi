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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-187d6371bc09b4ce4048cc49
    test_id: TEST-model-predicates-grounding-guards
    scope: end_to_end
    outcome: passed
    code_snapshot: 40cff72e51ee5de378fa19b9d2f70cfd31ec2d07500ff730d68dc96f142b281f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-12T19:34:56.564Z'
    finished_at: '2026-10-12T19:35:17.638Z'
    artifact_digest: 5a33d65fb648aae77244c7cd7bc11107449ded8b83c7ba17fe6bc169eae92d14
    contract_hash: 1724d97ee24667a3103da9ec1518845ccdbf5ec0d234a0336d8a1c7e1c27b106
    binding_hash: cccb4dbdb53703bf6e0b6bfb70fe790985bd0a96833aac597d6e41887fb2a911
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
---
Consumer suite that runs the scenario end to end through the CLI against a real engine: canonical_key recognition with and without the decision bound, extend_requirement and decisionConflicts under the owning and another requirement, the multi-clause plan applied through kb_apply_plan, and claimKey on a committed fact write.