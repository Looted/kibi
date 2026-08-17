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
---
The packed consumer test creates a tracked authored relationship after the initial compile, proves the scoped parity rule blocks on the exact missing edge, syncs, and proves the scoped check passes. Unit coverage separately proves runtime-only reverse ownership does not weaken authored-to-compiled detection.
