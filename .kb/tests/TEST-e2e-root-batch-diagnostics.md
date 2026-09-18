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
    receipt_id: PR-b18905b0a3aa1faf9835a22c
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: c8e5f6148f23feb0cf41ce1f86a01c78482d2f3d56c42cedb57420ae6b09c84a
    binding_hash: 6b7f18b0da1c1ad066807defe6d132e2d0731af426fcad6ad6ab3c8a565f80f5
    fingerprint: 491eddb02f51535afd5c87b884b87c73cef3b9ad6a5711f6b39d239283739dc3
    fingerprint_components:
      contract: c8e5f6148f23feb0cf41ce1f86a01c78482d2f3d56c42cedb57420ae6b09c84a
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
      - symbol_id: SYM-COVERAGE_SHARDS
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-root-batch-timeout-minutes
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-root-getBatchFailureMessage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-root-runBatch
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ba34be552d0608cf47024435
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
    binding_hash: 2f9b9bbccb839587488340a3e986fc0817ddd27780cf86f086797b7f81d8c8e4
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
---
