---
title: Packed authored-to-compiled relationship parity contract
status: active
priority: must
tags:
  - e2e
  - relationships
  - parity
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-source-relationship-parity
  required_case_symbols:
    - SYM-test-packed-source-relationship-parity
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-source-relationship-parity
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7525962e3b5cf39cd92e473e
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:04:23.112Z'
    finished_at: '2026-08-17T12:05:03.856Z'
    artifact_digest: 5e723fcd5b38267a9259699c91e8aa61cc0382d946674a3922895ac4aab23900
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40744
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1bdc19eef6f63ee3326dd448
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:54:26.660Z'
    finished_at: '2026-08-17T20:55:10.586Z'
    artifact_digest: 0670c882ba5c31b03323b4cd77ac3a66cb6d0859cbcf010b578dea5a2a5c5ba1
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43926
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e501c0d1d680b203ae8a0a1d
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:08:41.365Z'
    finished_at: '2026-08-18T07:09:26.329Z'
    artifact_digest: e2ce0285070fe6ba61cd80415d70eecc0f9f9f607c4a1aa97c6d9c43de700500
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44964
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc97ee12da22eca8f68c4b49
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:37:00.252Z'
    finished_at: '2026-08-18T10:37:45.405Z'
    artifact_digest: de45edca77e04cb9dda721334dc3a245533889b255e7a1d7319ec39b3b0d8efa
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45153
---
The packed consumer test creates a tracked authored relationship after the initial compile, proves the scoped parity rule blocks on the exact missing edge, syncs, and proves the scoped check passes. Unit coverage separately proves runtime-only reverse ownership does not weaken authored-to-compiled detection.
