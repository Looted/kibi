---
title: Documentation site renders repository sources and fails on broken links
status: passing
tags:
  - docs
  - site
  - pages
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-docs-site-pages-build
      target: default
  success_policy: all_required_first_attempt
id: TEST-docs-site-pages
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-deba6d2f42805ebbfd37f1c1
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 67d858a55796fd26e00f54db266fe342c994cb23424d111fa8a848defcba43cf
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T08:39:27.317Z'
    finished_at: '2026-09-29T08:39:28.237Z'
    artifact_digest: a1e8e954ad13bc176083cfb4ea840b38594cbcb99854ed14059ef43613f7c0e3
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 2f8169d314ea9c5056cf27f4ee29b5ac9dee6ab968ebe1a1d18b2830a4b05700
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d93b6fc7b3542c945c0acd1b
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 6519ff36502a44c9d11c42f209520dfed4d22918a8d0d55db45287e44d5cfecb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T08:46:17.204Z'
    finished_at: '2026-09-29T08:46:18.099Z'
    artifact_digest: b27ce8c13d2c8723f300a50bb403ecabbba9b9c76957bb8210d96691b537c85b
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 1c19cb5cb40a7d4e62c1f46355959a070e378a6744feb7330b347130dd64b8e3
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5802d36f0e26d65d480b00d4
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: bc1bca53ca45af57aa701b12ff3b3aebea683330837613f1b9a98c076c03ef6d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T07:35:10.608Z'
    finished_at: '2026-09-30T07:35:11.160Z'
    artifact_digest: 16b3fef6473a09c12233581585388a88c516368dc0566ef924d241fb7c5f412d
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: e2c614ca5fbfa2655996f62e611956ae8eb53000fb57e9b782af7ddd73b2e667
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-44a68c986ebdc0690158c8ec
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: a98f98864bd46257c0faf4b6b4030f2dea8fe8a67e29129519ca140aad401585
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T07:41:32.840Z'
    finished_at: '2026-09-30T07:41:33.515Z'
    artifact_digest: fec9b3991a9d3c44eab6e343d7b08fe8ae72dcc5c1553871c2b0a675dc76b94e
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 8789b8da394823399e52100af1d140d852be9161bd737e31c3e4a57ce44f0106
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ad2a3457753d3ae8af7aa5ee
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c84ba3219d4e347c07d76f43d865686c15aa2087b99a968098bbbf35dac4ada
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T11:25:58.876Z'
    finished_at: '2026-09-30T11:25:59.558Z'
    artifact_digest: 63154fd9f4979574e183e94e0f706dfbb76c0dd2d1e43fe9e99a4df6a9634f1b
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 0c72b21d2f133d5895c7accce328dd33174002c5a0d09538e8e9a21ea00ac535
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d5a737d3fdc0fe7e73e8f425
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 08c571a1159e02fceab7228e3e5602a4a4b3640c8cd9b07b52695408433f3d2c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T20:55:45.152Z'
    finished_at: '2026-09-30T21:39:09.186Z'
    artifact_digest: 1231ed5f54da37e9f82308adb82a0e2dffcd3ea781f5ccd044c5307ff8b49f96
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 0c72b21d2f133d5895c7accce328dd33174002c5a0d09538e8e9a21ea00ac535
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-75b1bcb5f34fbdf47f1198f0
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 6a05a0c7546d65aaaf79f3c99c9dad946475ceb341d1b6adb32c9b376a7c437c
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-docs-site-pages-build
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-992eceba210a2a07ee775c07
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 6a05a0c7546d65aaaf79f3c99c9dad946475ceb341d1b6adb32c9b376a7c437c
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
