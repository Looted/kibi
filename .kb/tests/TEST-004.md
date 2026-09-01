---
id: TEST-004
title: kibi check detects must-priority coverage violations
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - check
  - validation
links:
  - type: validates
    target: REQ-cli-check
  - type: validates
    target: SCEN-005
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-check
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b35e3bfc7a9be274961a631a
    test_id: TEST-004
    scope: end_to_end
    outcome: failed
    code_snapshot: 3f8b48dd84116905859ff9ad9beb6f42472888fcc02de24d6ff6ef46c41cba7f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-01T02:00:18.844Z'
    finished_at: '2026-09-01T02:24:25.062Z'
    artifact_digest: e0a3f7afc30f978f4299d03e9c4487f5048bf904f91509c6d0747dcbb0c5d1ea
    contract_hash: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
    fingerprint: 94f97b839d4a2976058c8c11d4fa4c3d46aa8c0bd29b39b461a0912b69609130
    fingerprint_components:
      contract: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-packed-cli-check
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-packed-cli-check
        target: default
        reason: 'run did not pass (outcome: failed)'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0c413d331c3e1e7bc8f74c72
    test_id: TEST-004
    scope: end_to_end
    outcome: passed
    code_snapshot: 72ab30da409f3a1d146a85cc81a6aaa3124fac328f92edc5b6fe99ed887d4ee1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-01T04:29:39.954Z'
    finished_at: '2026-09-01T05:13:15.667Z'
    artifact_digest: 2a51d21e49186d14cacba8be3e4e03420e04acc7c3d53eb30168e286dce30b75
    contract_hash: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
    fingerprint: 94f97b839d4a2976058c8c11d4fa4c3d46aa8c0bd29b39b461a0912b69609130
    fingerprint_components:
      contract: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
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
      - symbol_id: SYM-e2e-packed-cli-check
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Seeds KB with a `must`-priority requirement that has no linked scenario or test.
Runs `kibi check --rules must-priority-coverage`. Asserts:
- Exit code is non-zero
- Output contains the uncovered requirement's ID
- A requirement with full scenario + test coverage passes the same rule
