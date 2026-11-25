---
title: 'Rule layers: every rule declares knowledge or verification, and the verification layer holds the proof rules'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - check
  - rules
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-check-rule-layers
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T08:31:57.438Z'
id: TEST-kibi-check-rule-layers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-df2c32147ab2c20cb2a272cf
    test_id: TEST-kibi-check-rule-layers
    scope: end_to_end
    outcome: passed
    code_snapshot: ef4cb422e9cbceebe9cf4ac504e14f8ffc9fc0014dc645ec7de2466d3ff1d764
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T08:32:13.500Z'
    finished_at: '2026-11-25T08:32:13.555Z'
    artifact_digest: 75dde639906beba1d03479a7382d7f21ccb9239d9f4e0372206008463966ff43
    contract_hash: 5e633216792d7b4606affc4026efff98d35f84cacba44d7c9e684f120b0d5f7c
    binding_hash: d8eb4be74c1f0aab3905f883e23f8e7978ad3121f9c29c7e8778879ef4be219b
    fingerprint: 74e91016eba67038f6db51d44a1d1e999b051c1a13e9a3ac51f8619e927f5cf9
    fingerprint_components:
      contract: 5e633216792d7b4606affc4026efff98d35f84cacba44d7c9e684f120b0d5f7c
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
      - symbol_id: SYM-test-kibi-check-rule-layers
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/utils/rule-layers.test.ts`. It reads the generated rule registry and checks that every rule's layer is knowledge or verification, that the verification layer is exactly the six rules that ask for tests or proof, that the two layers partition the registry, that getRuleLayer reads one rule's layer, and that `packages/core/src/rule_registry.pl` states the same layer for every rule.
