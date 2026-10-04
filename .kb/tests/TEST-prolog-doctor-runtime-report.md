---
title: Doctor SWI-Prolog runtime report controls
status: active
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-doctor-runtime-report
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-doctor-runtime-report
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3b64e9c1e5f390b10391ac56
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 3d9aa1cd05cf3fa7405d9315cc4fe96ec4da7d660a7aefdd65ff9aabae90dc04
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:01:45.154Z'
    finished_at: '2026-09-30T23:01:46.088Z'
    artifact_digest: 5650d9a044dd386711118b1d43c6a6e3f0efe0d4110aa9e644e25fbf0a9f1815
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 4c966d32d874d8989b4f39f974f9ad391d3c7f675d01df783573f9514e604b17
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c6c064b1d83cadef2c0d7714
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 63f6d3dc8bbf32b8928f227d9c655d144d80ee4962205e7f9f5066dd9ea8def0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:26:33.826Z'
    finished_at: '2026-09-30T23:26:34.404Z'
    artifact_digest: 83d1d3198dd75904a588c92baa3b4fb09ae5579d63aec9d383184c560f06fde2
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 4c966d32d874d8989b4f39f974f9ad391d3c7f675d01df783573f9514e604b17
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a2d09a950ed1e8e1aaa86178
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e9167427ae939a3e23103a1ce519ea31cd0b777f3f9007ca75f34a2fe7a1f44
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:29:03.509Z'
    finished_at: '2026-09-30T23:29:04.033Z'
    artifact_digest: ef9e1413fc1b4eff24df1028e2d8a9e43f194a096afb569f8db12be1aa876cd8
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 508236329d28b12201412dd367c65339d282c6cc002756e037da75e1e0c88859
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-67610f028e3fced2cf3a02fa
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 4127a472ae2d2fb421ba7ac3873641c7dcf5429b0de51f24ab286b5ae40225ea
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:47:26.054Z'
    finished_at: '2026-09-30T23:47:26.616Z'
    artifact_digest: 83cafefd644f9882d5206274ee84b56529930e3b2fb6f9c40f45e7d3534d06a5
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 97636e745e5ac7ef1013c0c71d8a86b69c5b8c87c4246681ec47294a51deda86
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ff41f44f654c8e7e7e39f1b6
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 97636e745e5ac7ef1013c0c71d8a86b69c5b8c87c4246681ec47294a51deda86
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-03b9fcecf0cd0ef58518de65
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 97636e745e5ac7ef1013c0c71d8a86b69c5b8c87c4246681ec47294a51deda86
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-db897e4d3c89150a2af8da37
    test_id: TEST-prolog-doctor-runtime-report
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
    binding_hash: 97636e745e5ac7ef1013c0c71d8a86b69c5b8c87c4246681ec47294a51deda86
    fingerprint: b895a3d6da5c29255ca0c6e21500f69fca2669ef0e7f2b63d022a9e868c190cd
    fingerprint_components:
      contract: 1d7176f802716f02aad5e8ea8fc77837e03dac9573e57e22f6020b5ff8dc68d2
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
      - symbol_id: SYM-test-prolog-doctor-runtime-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
