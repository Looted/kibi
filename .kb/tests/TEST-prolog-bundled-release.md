---
title: Platform package population, symlink materialization, release workflow, and publish-metadata controls
status: active
tags:
  - prolog
  - bundle
  - release
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-populate-swipl-platform-packages
      target: default
    - symbol_id: SYM-test-release-pack-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-release
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3a46dbe7a7e6256a386f6a9a
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: f0abb9af7fbf0f19529cce0ef65c6d7568fb8301b4229efb5dce7b8b71b96891
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T01:15:33.198Z'
    finished_at: '2026-10-01T01:15:37.577Z'
    artifact_digest: c7d00fb0a6e77c1ea0a120b5a9f80d72a7b1ddd12d17af979ecc9208bea28e43
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: 1bbee1b354b3ad3fc91319c779f5412ebf0cc7e22ee8c57d443b891a0b61d194
    fingerprint: 0db9a526989b18ce3572df9f881da47e49f76c7dab7318f8c5172ee4ad41f3ce
    fingerprint_components:
      contract: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
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
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-release-pack-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d2553ce763b0cf11c760841b
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: 96401fc2c08e94005fbe58f94859e7405d9ae6a010791e8cba0d5f99dcd8d611
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T04:02:29.550Z'
    finished_at: '2026-10-01T04:02:33.030Z'
    artifact_digest: 06fa11375faa7f994010ea01351f2ca5ce2327b171166ecd49fc0dee20b93460
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: 1128a96506352e4df60c1d4a221a3bdf836609d148a315306d1afa7220471560
    fingerprint: 0db9a526989b18ce3572df9f881da47e49f76c7dab7318f8c5172ee4ad41f3ce
    fingerprint_components:
      contract: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
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
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-release-pack-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8c52a0d66c483a275c643ca1
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: cede081923b9b634c01eec22e72d80175809bfc0d6166733f0122d7276eefa78
    fingerprint: 0db9a526989b18ce3572df9f881da47e49f76c7dab7318f8c5172ee4ad41f3ce
    fingerprint_components:
      contract: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
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
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-release-pack-workflow-contract
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-test-release-pack-workflow-contract
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b3b98e3beaa31524066e3009
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: cede081923b9b634c01eec22e72d80175809bfc0d6166733f0122d7276eefa78
    fingerprint: 0db9a526989b18ce3572df9f881da47e49f76c7dab7318f8c5172ee4ad41f3ce
    fingerprint_components:
      contract: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
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
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-release-pack-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e20273e03fa54ea640fe04f3
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: cede081923b9b634c01eec22e72d80175809bfc0d6166733f0122d7276eefa78
    fingerprint: 0db9a526989b18ce3572df9f881da47e49f76c7dab7318f8c5172ee4ad41f3ce
    fingerprint_components:
      contract: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
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
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-release-pack-workflow-contract
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
