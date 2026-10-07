---
title: Curated suite batch runner surfaces actionable failure diagnostics
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-root-batch-diagnostics
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-df2127a09f14c7f434824bb0
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
    binding_hash: 713a5a3422fd0305f34b9c7db1eae7415ec5a97c5ae2bb2e89ef7c2c57847dda
    fingerprint: 8e1dc5fbf12bc3e17485a3d3fc4f4bfe0ca9ccf002ac2399a0cc5ed2c54f2e7e
    fingerprint_components:
      contract: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
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
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
tags:
  - review:context-missing
---
