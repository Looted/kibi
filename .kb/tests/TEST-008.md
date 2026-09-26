---
id: TEST-008
title: End-to-end init then sync then query then check pipeline passes
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - integration
  - e2e
  - cli
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-008
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-61e5ad39b6dbf852fcc1acad
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 010a65baaf9a1937e0452025b72b783d76d3ca5c06e68a7a9479e2182a7b6d3b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T06:34:19.896Z'
    finished_at: '2026-09-18T06:35:50.013Z'
    artifact_digest: 3ebcf0fb8a43812a6fc21888ebea4b3f4db49b8a475fe4430c02795bd5b7f6f5
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-789b37bf3bcbeb40a0331ca0
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-00d8df48ff32246188d9347b
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-694784eaa91ef40ea2222268
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d9e082f897eeb5f17ad43ca3
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9678c930779b8b4815325284
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-105c63249e7f5adc389a37d5
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-15a1fe450101ec182fcc920a
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f76bb8ae6c688316808eb130
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-38e4bf54b30d1108904ad5b2
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-35e4edf6d878ef9082be0a9a
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:28:07.384Z'
    finished_at: '2026-09-20T13:29:10.914Z'
    artifact_digest: a4018a8d53fb974c087c7248d0b2c560e1a7b6e45da329972a5c1d6d403784d0
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5ec9b3d29ca282492372cbf8
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-41927b270cd7f24fea4cac25
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9bf0cec7485dd785c731a659
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-26ee09f8655c49e980158445
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-266049b4be98d6df18aec392
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cdb494fd3f6019ec538fdbd8
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-795af1e6394b93d1d690d711
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 026ba98b14e8f9c63ae16ae56544c40c7a9aec88d99e765c467feab4c93aed44
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:37:01.236Z'
    finished_at: '2026-09-26T10:28:52.392Z'
    artifact_digest: 5ed6041777a5f930fb58af9f9643f36713c9610a885e9dd9822d3c3563759421
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +106 more'
---

Full pipeline in a temp directory:
1. `kibi init` — asserts exit 0
2. Place requirement and scenario markdown files with correct `links`
3. `kibi sync` — asserts exit 0 and entity count > 0
4. `kibi query req --format json` — asserts valid JSON array
5. `kibi check` — asserts exit 0 (coverage satisfied by the seeded scenario)
