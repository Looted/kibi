---
title: Doctor SWI-Prolog runtime report controls
status: active
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
  - review:context-missing
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-doctor-runtime-report
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-doctor-runtime-report
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-14d49a1a6f81906d2125c939
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 50b8826b8f9049cecc5cec1bd5ed778899d406dd6a9f30e086b2420f236c4dd4
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
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
