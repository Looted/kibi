---
title: Packed coverage reports conservative proof status with stable gaps
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-coverage-proof-status
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-coverage-proof-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b8f2880ea2c99eccd929013f
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: d1de908f0c0ce6c44cb114a705f3247feca2ba09f6205dab65945b281074dab2
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4f4fb0ac568a3070f5f1ee05
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f7337fdb3dad9c2f7dfa13a4
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e036322130959145b900a74b
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e92f9a59d04cf09fd899473c
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6bff8abe50c244edfdd1fd37
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e7c06e70583e7379d556183d
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cf2dc5ce8674ccaa7a8acabb
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-52991f8b7d58f524d6dd3475
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d42529c415d4c3cd3ddc423e
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b63b96628dd3cd7b393e5f1c
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7d979b49d851540068c2cd2f
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1449fbe3b2b8e11f977aacb2
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2c5b2dd5657998c9a7b2604d
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2399b74f5dd17b4cdeec4d06
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-990dff0d288a287af4c62a6d
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1f9d09f55fe9be4625f345c0
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f39912e15db61b8d4b56d9e4
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 17d26c6bf27a3e5fa42113f021bf2b250140851aea8a51dcb29e71ea85465ffc
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:09:39.572Z'
    finished_at: '2026-09-26T11:26:46.912Z'
    artifact_digest: 5e15c583ed601b53256856b0f62aa348fec3a03cc76f327007241136eff85214
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b21d2afadaf29f09f9304872
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: a20108970eddbe026c332f8f0fef6001fa956bf246b5dee956c8c7586f878071
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:43:16.296Z'
    finished_at: '2026-09-26T11:59:41.121Z'
    artifact_digest: b458ebe1ef850179dd754bc08eb0a62bb0e46b7bbf068e00bb4230915cc296ed
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ed9c593cecf1238fe7c8ec1c
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: de201a2dd0c317058bd0fb2437de496eaadfbdd3e21c3fd432d77169cc672e2e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T12:51:30.031Z'
    finished_at: '2026-09-26T13:07:42.195Z'
    artifact_digest: c9cece4a6c8412af4af92cf82807f3850d2b801045aacf7d48830d68278a660f
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9ea3b9601202c9a52599cc14
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 5b48c0a3883b7536cf6deb6ced03e3127349d55dfa5b78fcd7466dcabb3b1d46
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T23:50:31.951Z'
    finished_at: '2026-09-27T00:15:04.234Z'
    artifact_digest: 9641e1263e8cbd4aec2a63cf924f78c694de2fa481b3e6b278d288dc964e768b
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3218857dcc5c0071db48a4cc
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: edf31aeb17bae9696cd9be1db2cfdab1162934903a40aff8334d03e84edd5872
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T09:58:13.375Z'
    finished_at: '2026-09-27T10:21:29.406Z'
    artifact_digest: 601f3dfdaa45bbef34f649d3ddd7d3e53a7dc2ba372aa80398ec1e1a58170f59
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 6a62904dc843bf17889d574bdb55480aa8d12c787c5cc3f14d4c2b07f2f0ba04
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-42fb5b0815c82fca46d78e60
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 1c7fc342e7e2f6dde52ad4d4bfb3dccda5184f524d128ad26d3d6aa8928b80df
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T15:30:37.315Z'
    finished_at: '2026-09-27T16:09:53.858Z'
    artifact_digest: cab9ee9d09f579ccae00bea019b0266d72e41c24a37e65651b84956de238bb61
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: ee790e08de0def27f1a069720d46cea145e92c700b0f5beae5103d85bff99958
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-791a7e3d3b0161094d67cd3f
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d2237db9cb9df68ce5a43a5ebb63dbe6b70f66b617d7ffa68d33c708da3cf9f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T22:29:15.770Z'
    finished_at: '2026-09-27T23:18:57.015Z'
    artifact_digest: 63668ccae6cd3a610be243d571de8e94f160e26926e4fd9f926a702b3a19dd3e
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: c969d0e3c565e68770656d8aa8ff0bcb9dfd3a3cd8b07971d04480bc81631647
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c41094086f1cabfacd51040c
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:34:29.510Z'
    finished_at: '2026-09-30T09:53:47.264Z'
    artifact_digest: bf1056b84a11011e16a37703ce5da52de1172c40ecacc8002976e09efa49291d
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: e0629fb70073872c94c3648b408bea9a00c9784fd1f7d2b65581afdba1dfa2ee
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-811dd9531a57dda609c3d922
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 236e9f59476fa7156992bbafed0b29b4286313366e60fc39d2b568f7ac1c71d7
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d180c46a00387da00758635c
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 236e9f59476fa7156992bbafed0b29b4286313366e60fc39d2b568f7ac1c71d7
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2122dd14bd38ba89f2a6f67c
    test_id: TEST-e2e-coverage-proof-status
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
    binding_hash: 236e9f59476fa7156992bbafed0b29b4286313366e60fc39d2b568f7ac1c71d7
    fingerprint: 6dd4b56fc9ada38fc14a562c7e35e90f9824fa3f7dffeecc28fa7a3dbda7b63e
    fingerprint_components:
      contract: a543fa48f66294c16a462521d9cc176fae9a05c956813a2abeb09863b8fa6453
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
      - symbol_id: SYM-e2e-test-coverage-proof-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for packed coverage reports conservative proof status with stable gaps.
