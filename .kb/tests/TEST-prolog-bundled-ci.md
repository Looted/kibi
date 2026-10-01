---
title: CI workflow contract, proof workflow contract, and cached-build population controls
status: active
tags:
  - prolog
  - bundle
  - ci
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-ci
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a49850a610f3985bba1450f9
    test_id: TEST-prolog-bundled-ci
    scope: end_to_end
    outcome: passed
    code_snapshot: 96401fc2c08e94005fbe58f94859e7405d9ae6a010791e8cba0d5f99dcd8d611
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T04:02:13.043Z'
    finished_at: '2026-10-01T04:02:17.001Z'
    artifact_digest: a1a77b67dc6e30911541a0162bc948a4bdcfec69b218b1993eafb7fef7582c25
    contract_hash: 2367af30118c15fbb90e61344777bfac636742cf30e80ccfc6daaa8b6f2ab522
    binding_hash: 70dde4fecddb78a95130bfe833432d4bb89f2525e87db358b5dbc1a213e90d27
    fingerprint: f01ea5ffe1b7c0d6344908fe7c97ff86964d9fda87fe2e6113b40cd2fe59b544
    fingerprint_components:
      contract: 2367af30118c15fbb90e61344777bfac636742cf30e80ccfc6daaa8b6f2ab522
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
      - symbol_id: SYM-test-ci-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
