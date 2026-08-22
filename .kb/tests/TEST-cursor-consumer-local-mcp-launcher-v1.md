---
title: Cursor Consumer-Local MCP Launcher Verification
status: active
tags:
  - test
  - cursor
  - plugin
  - mcp
  - consumer-local
  - launcher
  - verification
priority: must
id: TEST-cursor-consumer-local-mcp-launcher-v1
type: test
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-cursor-consumer-local-mcp-launcher-v1
  required_case_symbols:
    - SYM-cursor-packed-launcher-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-750eb0e4875b4b36e7eb66b0
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:30:07.887Z'
    finished_at: '2026-08-21T23:30:13.823Z'
    artifact_digest: 24aa6a2126c48a17c1c540880a6630b3e07988e951dbd8117cc29a5e097bdb5d
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5936
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1468d02a627aa4fe52ef7e41
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:05:08.342Z'
    finished_at: '2026-08-22T07:05:13.145Z'
    artifact_digest: 1565b616099dc97eb41464cd5020390f71f4b6b03842dfcb68cefe518df51b06
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4803
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c23416a5777acd51cca7fbfe
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:06:48.807Z'
    finished_at: '2026-08-22T07:06:52.589Z'
    artifact_digest: cd4b1d73e43e69dc167e4c4c5f6c915ea801763e26744b6c6e8532e3ff1573e9
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3782
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3eb2dc4876156651e9a34797
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:24:38.414Z'
    finished_at: '2026-08-22T09:24:41.902Z'
    artifact_digest: 39f80d522a2334ff7a40f620e0824b51fd583e7cfd8cb2fa33fccd3fde1eaa43
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3488
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b70bbd69efa56ac28d0266bf
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:26:01.527Z'
    finished_at: '2026-08-22T09:26:04.932Z'
    artifact_digest: a3c6674a1ccc1448e77823e1b9aff4f813f68ffc0907dd33b39748d6b24bc983
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3405
  - version: kibi.verification-receipt.v2
    receipt_id: VR-303176596bd8b7d31fd82920
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:08:24.058Z'
    finished_at: '2026-08-22T10:08:27.341Z'
    artifact_digest: 2aa9682431685c8cf5fabed1671a847c922fe0314774556409d8d41d541af85a
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3283
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8186df22c361cf0de51da88f
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:09:45.151Z'
    finished_at: '2026-08-22T10:09:48.476Z'
    artifact_digest: 7255e9a54003198a492fbdf506765d772463a64832ecd30f8e6e5e1c5451be5c
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3325
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c79645a8d57a70b55abb8173
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:01:53.755Z'
    finished_at: '2026-08-22T13:01:56.872Z'
    artifact_digest: f2bd564e2938ea39c880d9caa2fe4870a9f28c36e19bce5bc0368b00f97acdbe
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3117
  - version: kibi.verification-receipt.v2
    receipt_id: VR-17f420ed997df89d2d266df9
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:03:06.039Z'
    finished_at: '2026-08-22T13:03:08.932Z'
    artifact_digest: 3d83bce0f1c793a1f6de6c7d991b91a28ffcefd6afbe5169f83407bdb914e50f
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2893
---
