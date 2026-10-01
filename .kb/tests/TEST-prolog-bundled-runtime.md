---
title: Resolver, package metadata, and launch environment controls
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
    - symbol_id: SYM-test-prolog-bundled-runtime
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-runtime
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a07a6d1837e4029da0fa9dab
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: 3d9aa1cd05cf3fa7405d9315cc4fe96ec4da7d660a7aefdd65ff9aabae90dc04
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:01:28.838Z'
    finished_at: '2026-09-30T23:01:38.229Z'
    artifact_digest: 846dce92b146b16f425e50c7c4f0e01b495bd74d902146190d22a389e52fca9b
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 0a78c5a086cf335c06758d97a13e216e906d87d57f0f60978ca39d91fc9218a0
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8b0ea8aeda069f4b180ee4af
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: 63f6d3dc8bbf32b8928f227d9c655d144d80ee4962205e7f9f5066dd9ea8def0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:26:18.827Z'
    finished_at: '2026-09-30T23:26:28.165Z'
    artifact_digest: 5c2e6707ec8d6d4fa0100aab72206ac032ec8344d65393e51d7a696024251235
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 0a78c5a086cf335c06758d97a13e216e906d87d57f0f60978ca39d91fc9218a0
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9b8432726447ac89a1446fe3
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e9167427ae939a3e23103a1ce519ea31cd0b777f3f9007ca75f34a2fe7a1f44
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:28:48.467Z'
    finished_at: '2026-09-30T23:28:57.698Z'
    artifact_digest: 2da82ec7da47cd05f05271ebe6c9cb971663735d13d2917c08def73d0e8ed46c
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: da04f060682615783e1117eb36a2bdd13ed330f14d76abda6914cd76d905a27e
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-156353f0edadf79abd9fd636
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: 4127a472ae2d2fb421ba7ac3873641c7dcf5429b0de51f24ab286b5ae40225ea
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:47:10.409Z'
    finished_at: '2026-09-30T23:47:19.697Z'
    artifact_digest: 97fa6c8c4e484b5fa4eca7a7a566b955b890fef389830d5219bf279f538eeb11
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 5f09dcddd699ccebda099200288d62277bebb2b64fc4eda25f5d9cddda064c41
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4c69ec560130f7d083d1db17
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 5f09dcddd699ccebda099200288d62277bebb2b64fc4eda25f5d9cddda064c41
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6f4dbfa714cfdcb62e23beed
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 5f09dcddd699ccebda099200288d62277bebb2b64fc4eda25f5d9cddda064c41
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3e6793922f599be601c65a55
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 5f09dcddd699ccebda099200288d62277bebb2b64fc4eda25f5d9cddda064c41
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
