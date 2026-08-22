---
title: Packed Codex Plugin Resolves Consumer-Local MCP
status: active
priority: must
text_ref: documentation/tests/e2e/packed/codex-plugin.test.ts
tags:
  - test
  - e2e
  - packed
  - codex
  - plugin
  - mcp
  - consumer-local
id: TEST-codex-consumer-local-mcp-registration-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-codex-consumer-local-mcp-registration-v1
  required_case_symbols:
    - SYM-codex-packed-plugin-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f0f0d665346a688ae4415baf
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:30:23.935Z'
    finished_at: '2026-08-21T23:30:32.104Z'
    artifact_digest: ec0c2b10b642fd70b335d42fac0974e4392f2e9f6f984bc95e701c5522fc3940
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8169
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7b55b1b795a3511596836fc5
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:05:20.951Z'
    finished_at: '2026-08-22T07:05:26.900Z'
    artifact_digest: 1c0c07b2d3738928d9e9413763b92ef7e16d708e6f0fdf1fc26b552ba16683cd
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5949
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1ee07e410b1a70aa2320f96a
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:07:00.966Z'
    finished_at: '2026-08-22T07:07:06.205Z'
    artifact_digest: 479d5b2119bd7b4c354ebadd7ac28cf2b5b6b91bd11f809d8b9fe3e45f0da5b7
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5239
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4d55170da284264c2a309cb8
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:24:48.330Z'
    finished_at: '2026-08-22T09:24:52.753Z'
    artifact_digest: 041a808dbb39bb4472ce16d581ef0f4d47ce0f582cac21f93e3a4dceebe99076
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4423
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b82e7284f31f8a167d25bf72
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:26:11.767Z'
    finished_at: '2026-08-22T09:26:16.119Z'
    artifact_digest: a7c7f63a0f98d876b11c62d2dab2064c3fbc50b3a6363f041a775b35544c5bb3
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4352
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e83e1ca4df3f3fb1ed658cd9
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:08:33.598Z'
    finished_at: '2026-08-22T10:08:37.957Z'
    artifact_digest: b855a14cc9fce357f93b5f5be2552880bbaee36dc46c5b003b11e9d0fab8aae7
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4359
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a4aa10f1bd1b248ef7a4ff6d
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:09:55.078Z'
    finished_at: '2026-08-22T10:09:59.388Z'
    artifact_digest: cc9230034d372fbd878195d7268493e67047c62d264d5d735a40a1c513531c44
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4310
---
