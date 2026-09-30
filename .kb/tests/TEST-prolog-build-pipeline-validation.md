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
---
