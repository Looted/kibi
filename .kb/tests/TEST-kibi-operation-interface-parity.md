---
id: TEST-kibi-operation-interface-parity
title: Kibi public operation parity verification plan
type: test
status: passing
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-22T00:00:00.000Z
source: documentation/tests/TEST-kibi-operation-interface-parity.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - mcp
  - cli
  - parity
  - policy
  - test
links:
  - type: validates
    target: SCEN-kibi-operation-interface-parity
  - type: relates_to
    target: ADR-022
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-63b15d823d70219528a3c461
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: 71b43ef38f0945d5febd8dad9a12223a2f13e5092564f8222974a6fb48fc1ea5
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T06:30:49.943Z'
    finished_at: '2026-09-06T07:22:27.216Z'
    artifact_digest: 874dd5c6d454cff93bdf784b60380ee2fa22f4058f4382076d931c84dde61ccd
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-packed-dependency-ordered-repair-plan (failed), SYM-e2e-packed-cli-github-report (failed), SYM-test-core-journaled-engine-delta-sync (failed), SYM-test-opencode-bootstrap-paths (failed), SYM-codex-packed-plugin-e2e (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-852a0b5b331f3ed47365fc18
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 9648b885459e3a707873828ffc71810a3f3087e64d820acb1e5c20c4d424ee78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T08:03:27.689Z'
    finished_at: '2026-09-06T08:53:08.385Z'
    artifact_digest: a9446e6bf639a8313722c309e3e6a6bf674e647b465bc9a1f94f58e2956e82a6
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fea90822740af95b0406c3f3
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 7a4310b9bccfd5ad2dc5dee7081fe78f9a64ccd5e179422b91542bb71e857382
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T09:14:02.169Z'
    finished_at: '2026-09-06T09:59:05.533Z'
    artifact_digest: 9700ae4ded2511c37e52dea96afb2ea71ea74ee07cd3bfef21fcf341d6714563
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c4dec8b611a73b72aff546ac
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 877cc6202786943ab48c6e5914d1be7d4635e7e4450368b7cbb1cfbd537aeded
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T10:13:05.534Z'
    finished_at: '2026-09-06T11:02:05.222Z'
    artifact_digest: 3da3eeee7d1f0f1eba5c4f27b12c053492661a41debcb4cc9944e6b22926a852
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fcc9b0fee73a889bad9225fa
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 15d2df13c1aeebc7302d91ab2a445d19802b0196958c8f17233b6c8844125d1d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T10:27:52.302Z'
    finished_at: '2026-09-08T11:19:24.843Z'
    artifact_digest: 3091125a96f8af53d17af9fc1a0360c82fd3fc05d382983186f3630f4ac591b9
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-61cf08ed0503f61e909cda8b
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T11:33:22.904Z'
    finished_at: '2026-09-08T12:49:16.395Z'
    artifact_digest: 2530f959a42f3cfa57d657b0d37ca5b35e47c46afda172d202b7e47e98f2b4ce
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3377a2b850c8a4c9cdb51a9a
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T22:25:21.260Z'
    finished_at: '2026-09-08T23:59:14.030Z'
    artifact_digest: 5e672ca9a5db1ab9542e79720f36a07a82650e12bd2d2a4066af2d1f8bdeb09e
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-50ca03e3f8d01d0db2a35faa
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T00:13:05.070Z'
    finished_at: '2026-09-09T01:03:10.098Z'
    artifact_digest: bad89c9316ec0948292d39d63faffe1fdf072c400c78d70d8b9e1a69dcd2f4c0
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-db4735e2e06644a854526f2c
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T01:18:18.386Z'
    finished_at: '2026-09-09T02:07:31.793Z'
    artifact_digest: f70be05eaa4900406e5d2ab89e25e438aa7addb3864b239f923e8ac6f7cac34b
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ed1476f298da27d01121fcef
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 1955583b07a497b4ba3947edc2325838963105f1b93eebb7989c35f9d9976ca5
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T02:29:08.409Z'
    finished_at: '2026-09-09T03:17:04.010Z'
    artifact_digest: 0d941f4678ef7cf87c2ac37adb34ade41184a92a42472615745fe05781aa7151
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-34fdc0f2a04e82fb4dbe23fc
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 73304a19a83bfbaca3e3d0e52a7b97d454de2c753b8405c2eda73ca29bbef16c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T04:59:46.377Z'
    finished_at: '2026-09-09T05:44:19.775Z'
    artifact_digest: 50031ad292386cf2c587290d2bf043370abe66901e46814bcbe103fa994f6f7e
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f67272f75cd4127c328819fb
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 558de15f49a44612ab5506fd412ea2e1c0d774b8f8745243c0df15bb012d3ba2
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T06:05:52.608Z'
    finished_at: '2026-09-09T06:50:18.571Z'
    artifact_digest: 4f935be4b3d114a7b897b05094252c069c971d14ef24fb3e406f99f0683792b3
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4d91eed8d22fb90e869d39da
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T07:39:42.865Z'
    finished_at: '2026-09-09T08:30:39.011Z'
    artifact_digest: 133420075f0adea4c311c3138f41d8ee31c6f8e7bd30355041389b5d200224ae
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-core-adr-supersession (failed), SYM-test-core-journaled-engine-persistence (failed), SYM-e2e-test-agent-guided-migration-orchestration (failed), SYM-e2e-test-kibi-logical-requirement-coverage (failed), SYM-test-packed-fresh-verification-receipts (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8a215041523501bbd2803711
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T08:39:23.385Z'
    finished_at: '2026-09-09T09:23:52.214Z'
    artifact_digest: 205a84ca07cf48423f589304f5887175724238701dc00650fc5e5c6acaf165c1
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4a9e6e574a5be14344340f31
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 88f7db573953eb069d10f6e92c42d41ff7b777c025efedbc8c087901bdf86f70
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T09:37:57.606Z'
    finished_at: '2026-09-09T10:22:19.843Z'
    artifact_digest: d113351a4cc8ce4d655ad86ddf8339c9a390ad00ed397e90eb41a0a9c494c287
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8117d219c8a57280a6e0c611
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 79ff0d34362721426b024912cd0b299cb0a72531a626020d29837330b1ec6434
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-09T23:33:23.834Z'
    finished_at: '2026-09-10T00:22:01.917Z'
    artifact_digest: 4f4ad525ec33f63a0645a9fe17519fe95eef71efc4eeda86cba43334e730afcd
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-258bb611a789c8c39b68c75a
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: 79f838abae86001aa78ba97d7be9f63467709effbd55b97118f9a0ccef937803
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-12T00:53:36.381Z'
    finished_at: '2026-09-12T02:23:02.095Z'
    artifact_digest: 729ba6000636c5b9faca47c20a964ecb8e3b5ed9f9a1c753d181e5febbb50b8c
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a61026454c1ee78df1239db3
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 609b27d4e5672c4000011b090499931e6a1fe38be1981e2088de3e3e4fb2f277
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T20:17:13.278Z'
    finished_at: '2026-09-13T21:56:21.890Z'
    artifact_digest: c976524424d5b291f4e58e762a7e0fe0a5f0e09d457a6213cfaaa0195a072de4
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1865f5346c5faf197513eaf5
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 0b5814a1764ceb7e33a105329bcfac1ca4ab366405f4083d213938472376fb44
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T22:14:34.497Z'
    finished_at: '2026-09-13T23:51:44.048Z'
    artifact_digest: f22bd2804415e7b28c082cc4e0491f9cc5b9947a5bb0b6aa76bd06e39712bf82
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-181335954cb292006ecfe1a0
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 32fc8076ce1ce9656d665c040aae2f438b4d47e12d23ad67c7e2396871cdb96b
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T04:53:57.354Z'
    finished_at: '2026-09-14T06:13:26.255Z'
    artifact_digest: 738ce45f97ae1097eadd640367ac094351b9f6ecf2c331c84e56b71e495f7f77
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-07d4624f4cbbf1fb43a1dcd9
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: ed40ba5e905305e0049ad3548381193ed09b7a4c16602e2deb3c109eb7acda13
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T06:29:52.699Z'
    finished_at: '2026-09-14T07:37:41.045Z'
    artifact_digest: 9e21e6884d6f07025a28d1aff21db0b67358a05dc6a0cc0df2654eaacf06dcfb
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-48f5e41ff6619da366d2edc2
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 807961781c537e824f0bd98a27b157fdb699f858cd39d2bd42acef64a5f2222a
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T13:11:45.423Z'
    finished_at: '2026-09-14T13:37:56.113Z'
    artifact_digest: fadc0c61f917b435961101344a5a47a8790fd55e5b9d0f389a413cce82a57531
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1ac9a9cbc5b855681fb9cdfb
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: c613c587e4ca4b7b68ef60af5587603c701a24922708732b2e3202cfd1e44c62
    environment_hash: 099f7c7810817359ceb53f590959a4934481728356256c4ad8d76cebc5094929
    started_at: '2026-09-15T03:23:50.237Z'
    finished_at: '2026-09-15T03:55:17.162Z'
    artifact_digest: ec6b0a857165cc564b40009d6e1f29fdaa822402c84a5f3b4b67b11b265d8826
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1d929d5a5c612b7846283e1b
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: a4e7bee0eccf1ef30deb244bf5e02822ca9e2a1be722875afeca276af1d00111
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T13:38:13.291Z'
    finished_at: '2026-09-17T14:08:43.421Z'
    artifact_digest: 4b46bd7e42bc97e7e45ccb151d3a1ad8ccea0423f2db0cc425f71995ffa9e3ef
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-be3448fdae2dfaefb05e7680
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 1972508a4652f82750d93bee293666961045af7bcdd157c91e02647eb24ecfdd
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T14:29:34.065Z'
    finished_at: '2026-09-17T15:00:23.481Z'
    artifact_digest: accb6c6e18f474a89e4bbe8c043408988ae33c7c519bba0b407911c115668680
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7ab2fb63fc36ead4fd5632b7
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 59396fc4de3f764873a8a552bcced7d61f442f84fa3bf0465ec0c7a0913a4e88
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T17:26:27.052Z'
    finished_at: '2026-09-17T18:09:58.071Z'
    artifact_digest: 444bb68a2c1abf8fec72ed6f4d7706c83ea382ef4d27c447919af7b99a789681
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c56cf49c97e1333cc699fe12
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 82583d2845302db2951548815aeeb65ec8245210e1b3f35f9871222b58ba20bb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T19:55:25.617Z'
    finished_at: '2026-09-17T20:35:57.777Z'
    artifact_digest: 4ba7b11bc867e8ae48adccd54eaa298232996cee139ad0caf04b3fc19341fa55
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4dcc12c10d22f20618582419
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-890d93a7b12c6cdc0650ca6c
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 7dce1afe0fdd43aa1d0e4feea031d222163ed053450d755795c7e5b9b1b332b5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T11:08:18.939Z'
    finished_at: '2026-09-18T11:31:55.494Z'
    artifact_digest: 1305c15266e3c7a81377bac6480bd3ebd0eb54580efdb96dd5a10302f76039f2
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-da270f73ab0acaca3caa2d19
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: 836265c397ac0441eceebc0056d9add2aa2b00f09ed174c44dd9bd2ed7cdfaf5
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8ad6ae9c708674ca511c16d2
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: bb52ea0712d636162a4a4076eaf31f056a47f2635d5a757f47d95037e3c78337
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-268bccfb8093e5108cb2cc37
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: bb52ea0712d636162a4a4076eaf31f056a47f2635d5a757f47d95037e3c78337
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3189975391a07e37a4e862b6
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: bb52ea0712d636162a4a4076eaf31f056a47f2635d5a757f47d95037e3c78337
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8f434df99cd89425d774f329
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: bb52ea0712d636162a4a4076eaf31f056a47f2635d5a757f47d95037e3c78337
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-75d1fd3a672e49616846a242
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: bb52ea0712d636162a4a4076eaf31f056a47f2635d5a757f47d95037e3c78337
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
## Test Coverage

### Policy Checks

- The strict fact lane models the operation surface as exactly 18 peer operations.
- The requirement, scenario, test, and ADR links all resolve without dangling references.
- The docs describe MCP and CLI as peers, not as primary and secondary surfaces.
- The CLI reference enumerates all 18 `--input` routes, object-input rules, exit codes `0`/`1`/`2`, and the canonical `find-gaps` command with its `gaps` alias.
- Symbol coverage includes shared operation executors, CLI protocol modules, CLI/MCP runtime adapters, the Cursor worktree resolver, and the canonical skill generator.
- CLI lifecycle tests prove that pending JSON output drains before the entrypoint requests explicit process termination.
- Remote SPARQL operation, CLI JSON, MCP adapter, and parity tests use a loopback-only HTTP fixture and verify shared decoding, HTTP(S)-only validation, and timeout cancellation without public endpoint access.
