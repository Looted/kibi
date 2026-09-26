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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e9f31a33a3d5aafb839a92f9
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1d0b7a575142f54ab53a0592
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dce52816226365a331a8a563
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fe83504e40226833bcb43242
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-960598b0abde4f85be515b77
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a5738126af0e2c7a2c8b154e
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c3e29638a05bbec5bd764e62
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-77fe901c796d611943da47b3
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ee7f9f62880970eaa9fbe534
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0a2575b6e812c92df4fab09f
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f7023544839402355fdabe2e
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d23522e155d2151380cabd5d
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4fe569fb3f75f3775df8c2a2
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-703e1297efa292a54c961973
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ff012ac69c928704840badcd
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4d81ad5fdbb1ef137613533b
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 45d848237d557a6e290df2f21725892d4a805ab3c66e339e91d3f63063bc431d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:16:48.105Z'
    finished_at: '2026-09-26T09:49:08.338Z'
    artifact_digest: 29d16748072a8b5bc21e7e3989b85a2f74045caa17d5cefd0f28a01bd7c20475
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a44898e2059fc096ff545c40
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 9dbe4fb057da0e02fad37fd3dbd7aae5e3393101253e24902bad17c197028265
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T12:23:22.746Z'
    finished_at: '2026-09-26T12:51:34.877Z'
    artifact_digest: 0a7403d1c8dd53721eb26b4662e3a3dce6f8718b2d08b6af1084b986cf357e5c
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9cde16223b03ca84b32ed8bc
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: a7ed89bae32292cfe9ed19c85d9e29156dd9f407801a376c53b17bd99c516272
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T13:28:00.705Z'
    finished_at: '2026-09-26T14:05:07.818Z'
    artifact_digest: b8a1b2bed3a49e14541c6419f9fdb0610b30509d8cf70f6f6fb0e2f446ee9dbd
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
