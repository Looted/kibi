---
title: MCP refreshes an externally replaced branch KB snapshot
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-mcp-freshness-external-replace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c9d6fa441303fe7629b5912f
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
    binding_hash: 6244c58d689e0987fcda256f99c2c2a27954494347e9155f7bd9a0e79d5b3b5b
    fingerprint: d7d19108ce5e2ace3c65e0feccb41b17ddaab5c903f9340f45477b6b0576596a
    fingerprint_components:
      contract: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
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
      - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a3e46a476c3870a0cd312967
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
    binding_hash: d6c7d35fa8e2430bde7067ab9606d3c79032b26b9c3983d5b8396e45afb9b9e9
    fingerprint: d7d19108ce5e2ace3c65e0feccb41b17ddaab5c903f9340f45477b6b0576596a
    fingerprint_components:
      contract: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
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
      - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-da36845a671fd2645baacaba
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
    binding_hash: d6c7d35fa8e2430bde7067ab9606d3c79032b26b9c3983d5b8396e45afb9b9e9
    fingerprint: d7d19108ce5e2ace3c65e0feccb41b17ddaab5c903f9340f45477b6b0576596a
    fingerprint_components:
      contract: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
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
      - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
---

Packed end-to-end regression for mcp refreshes an externally replaced branch kb snapshot.
