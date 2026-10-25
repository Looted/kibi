---
title: Packed authored-to-compiled relationship parity contract
status: active
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
    receipt_id: PR-34dbde0a86ac3314675d4c2a
    test_id: TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:31:53.277Z'
    finished_at: '2026-10-25T12:31:56.831Z'
    artifact_digest: b24450abafe8f0508e099bdddff55b9993fdf0042558799507510908234335c1
    contract_hash: 4e160c2c11ad46ba3f499cc9c9d9e76cc4ecdf5206a29e0f4f17626c6a48b332
    binding_hash: 3bd42dc596f37a0e6cb01124ddc3a28724ffbe11bd15cff87d2528ff673567b0
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
