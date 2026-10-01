---
title: SWI-Prolog pipeline validates artifact boundaries with behavioral controls
status: active
tags:
  - prolog
  - build
  - pipeline
  - validation
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-build-pipeline-validation
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-build-pipeline-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f0a8bc0c2dfa6a421b79d8c1
    test_id: TEST-prolog-build-pipeline-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: e1139bbe57b26478435f4fce1d176701eea36bacaefe8b62d84cb23491d4271d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T18:19:24.879Z'
    finished_at: '2026-09-30T18:20:00.861Z'
    artifact_digest: f1e31c30422393d604385c24b1bffd261afd7849bf17e31c692ec5de309837d8
    contract_hash: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
    binding_hash: 28d5b033fcace59874a7995040dee2ac224f954e046dbd5da2c9bcaa00739c1d
    fingerprint: a2662d6d8f5823a794ae2fd17d2c367a7b2ef5baf917b021b29f21fc0d5d3477
    fingerprint_components:
      contract: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
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
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-053543ca5a1be370e3a5e63c
    test_id: TEST-prolog-build-pipeline-validation
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
    binding_hash: bf11c799516e1950f1193de7a516a021d526210efa313c2ddde8be854559fd98
    fingerprint: a2662d6d8f5823a794ae2fd17d2c367a7b2ef5baf917b021b29f21fc0d5d3477
    fingerprint_components:
      contract: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
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
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6ac6095cc39b9aadb2f1432f
    test_id: TEST-prolog-build-pipeline-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
    binding_hash: bf11c799516e1950f1193de7a516a021d526210efa313c2ddde8be854559fd98
    fingerprint: a2662d6d8f5823a794ae2fd17d2c367a7b2ef5baf917b021b29f21fc0d5d3477
    fingerprint_components:
      contract: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
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
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
