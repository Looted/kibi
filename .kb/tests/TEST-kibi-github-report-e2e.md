---
title: Packed CLI GitHub report workflow and badge E2E
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
  - e2e
text_ref: documentation/tests/e2e/packed/github-report-integration.test.ts
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-github-report-e2e
  required_case_symbols:
    - SYM-e2e-packed-cli-github-report
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-github-report-e2e
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-00a2007dfb839a66ece2ceee
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:29:48.241Z'
    finished_at: '2026-08-21T23:29:57.578Z'
    artifact_digest: 73557e37a904ee93f7c601ab6b85c0bed7461a3f3a4651da9a0710815eeff8dc
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9337
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b77e884173a2d83d39fc31cf
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:04:52.798Z'
    finished_at: '2026-08-22T07:04:59.416Z'
    artifact_digest: b4237a759bb3f33b6c67f9ccc81bd2565e4d5467a01e690b21392a69c770b9cf
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6618
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e158843bcf75108800e865f0
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:24:25.900Z'
    finished_at: '2026-08-22T09:24:31.652Z'
    artifact_digest: 1de9b636d4ad05a525cc9c6bcfeaa3c2ccf9bf643948d1dcbb49e611c9ca8972
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5752
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7c54122f21b053d56f125dac
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:08:12.372Z'
    finished_at: '2026-08-22T10:08:17.628Z'
    artifact_digest: 7030a0d4eb5ca1698b62e2c7263c5786f7f91a775861ec7e8e44b03f374c16a9
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5256
---
