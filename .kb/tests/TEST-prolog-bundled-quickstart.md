---
title: Install guidance contract and README quick-start walkthrough controls
status: active
tags:
  - prolog
  - bundle
  - ci
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bundled-swipl-docs
      target: default
    - symbol_id: SYM-test-simulate-readme-quickstart
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-quickstart
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9eb34f415c015d3a92f9f1bc
    test_id: TEST-prolog-bundled-quickstart
    scope: end_to_end
    outcome: passed
    code_snapshot: 96401fc2c08e94005fbe58f94859e7405d9ae6a010791e8cba0d5f99dcd8d611
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T04:02:23.227Z'
    finished_at: '2026-10-01T04:02:23.321Z'
    artifact_digest: 5fb418f9241e903231a945eb1dd67d8a2079598e21c3eb5ee4eff2c3c81ceb0e
    contract_hash: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
    binding_hash: c76ebf0a234811fd6d7bf61b718ecba66a685acde6cb335816d03d790ed3b5ab
    fingerprint: 751fad5fd9819f500d13719e27aba79967faf25d764c277eb0d1b5dc64198e46
    fingerprint_components:
      contract: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
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
      - symbol_id: SYM-test-bundled-swipl-docs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-simulate-readme-quickstart
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9622c12562514a190294e09a
    test_id: TEST-prolog-bundled-quickstart
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
    binding_hash: c76ebf0a234811fd6d7bf61b718ecba66a685acde6cb335816d03d790ed3b5ab
    fingerprint: 751fad5fd9819f500d13719e27aba79967faf25d764c277eb0d1b5dc64198e46
    fingerprint_components:
      contract: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
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
      - symbol_id: SYM-test-bundled-swipl-docs
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-simulate-readme-quickstart
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-bundled-swipl-docs
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-test-simulate-readme-quickstart
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-25d154ea46618ed9c1de44b7
    test_id: TEST-prolog-bundled-quickstart
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
    binding_hash: c76ebf0a234811fd6d7bf61b718ecba66a685acde6cb335816d03d790ed3b5ab
    fingerprint: 751fad5fd9819f500d13719e27aba79967faf25d764c277eb0d1b5dc64198e46
    fingerprint_components:
      contract: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
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
      - symbol_id: SYM-test-bundled-swipl-docs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-simulate-readme-quickstart
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4fe222e68b7da0a800270302
    test_id: TEST-prolog-bundled-quickstart
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
    binding_hash: c76ebf0a234811fd6d7bf61b718ecba66a685acde6cb335816d03d790ed3b5ab
    fingerprint: 751fad5fd9819f500d13719e27aba79967faf25d764c277eb0d1b5dc64198e46
    fingerprint_components:
      contract: eca122c4e3f9aad7a75e9f74ce81b09c290b27be16d8bd133ef3ad12b346686f
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
      - symbol_id: SYM-test-bundled-swipl-docs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-simulate-readme-quickstart
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
