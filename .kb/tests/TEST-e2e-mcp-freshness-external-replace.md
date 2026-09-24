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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-53a8c0ef38a56650b66813ca
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
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
    receipt_id: PR-2898af4646f2e86fd0edaf5f
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
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
    receipt_id: PR-847ace0d1fa3aedebc1eea9a
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9b4ca62b56e708554bbe0433
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
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
    receipt_id: PR-a78274441fc22b5cb76da59c
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-73309e0b8354fcc7c83e2326
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3972a1e95a9a942e76d06572
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-76cfaeb5d69434ff513c61d1
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
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
    receipt_id: PR-6236aaecdf0ce31e66b29a91
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
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
    receipt_id: PR-74e8fd23fc2cceda2936e820
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
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
    receipt_id: PR-1cce1a4be58f39990ae7be6e
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
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
    receipt_id: PR-3b83517ae7e8c95dfae2e79d
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: e264306112c8caafa81e89d43554480472a24c82b695f86565107d4e38218c7c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-24T16:02:27.199Z'
    finished_at: '2026-09-24T16:03:16.045Z'
    artifact_digest: 2e2ffcd61100fda058f4402ee02a98dd603f699b1200d9b33d8522b36801b60c
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
---

Packed end-to-end regression for mcp refreshes an externally replaced branch kb snapshot.
