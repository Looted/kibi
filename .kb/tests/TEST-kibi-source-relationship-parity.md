---
title: Packed authored-to-compiled relationship parity contract
status: passing
priority: must
tags:
  - e2e
  - relationships
  - parity
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-source-relationship-parity
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-source-relationship-parity
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-692e966cd532e25ddd52f19f
    test_id: TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 4e160c2c11ad46ba3f499cc9c9d9e76cc4ecdf5206a29e0f4f17626c6a48b332
    binding_hash: 9be878972bc267fde696f8093d7c88c66fdc9eae8d1a922f32ac636cc077dad4
    fingerprint: 416ac301da5fcfc8d5e52d717b1b3c2ae53cab49dae089ee95216194fa500ea2
    fingerprint_components:
      contract: 4e160c2c11ad46ba3f499cc9c9d9e76cc4ecdf5206a29e0f4f17626c6a48b332
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
      - symbol_id: SYM-test-packed-source-relationship-parity
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
The packed consumer test creates a tracked authored relationship after the initial compile, proves the scoped parity rule blocks on the exact missing edge, syncs, and proves the scoped check passes. Unit coverage separately proves runtime-only reverse ownership does not weaken authored-to-compiled detection.
