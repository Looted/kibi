---
id: TEST-kibi-conservative-requirement-proof
title: Conservative requirement proof report tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - requirements
  - proof
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-CONSERVATIVE-20260810-01
    test_id: TEST-kibi-conservative-requirement-proof
    runner: bash
    command: swipl -q -g "load_test_files([]),run_tests,halt" -t halt packages/core/tests/kb.plt && bun test --timeout 15000 packages/cli/tests/commands/coverage.test.ts packages/cli/tests/commands/status.test.ts packages/cli/tests/operations/discovery.test.ts packages/cli/tests/operations/reporting.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/status.test.ts packages/mcp/tests/server/tools.test.ts
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:55:32.132Z'
    finished_at: '2026-08-10T15:56:09.566Z'
    artifact_digest: f4a6c9a83f1c333fda595f4a81fad506b07a8596d35218981fdd705ed5bc01d9
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-CONSERVATIVE-20260810-02
    test_id: TEST-kibi-conservative-requirement-proof
    runner: bash
    command: swipl -q -g "load_test_files([]),run_tests,halt" -t halt packages/core/tests/kb.plt && bun test --timeout 15000 packages/cli/tests/commands/coverage.test.ts packages/cli/tests/commands/status.test.ts packages/cli/tests/operations/discovery.test.ts packages/cli/tests/operations/reporting.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/status.test.ts packages/mcp/tests/server/tools.test.ts
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:10:54.711Z'
    finished_at: '2026-08-10T16:11:34.747Z'
    artifact_digest: 0988c8df2ed3a9f2682b1e5a1d67f8588c6d97774cf78eefc1e8a4e735cf8ee1
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6fb044a6eab0104d1de23ea5
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: failed
    code_snapshot: 3c7cf6857c6c8a0d059fecdeaa3fa28144954b375fb37d8a857f6c2919134711
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T18:57:34.657Z'
    finished_at: '2026-08-16T18:57:35.548Z'
    artifact_digest: 7a3a199f734f563b953c0840b68d9e47d025573e2af737950c9dead3b2fa636c
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: failed
        retries: 0
        duration_ms: 891
  - version: kibi.verification-receipt.v2
    receipt_id: VR-16c5b29a7f2505160bc202af
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T18:58:50.928Z'
    finished_at: '2026-08-16T18:59:19.460Z'
    artifact_digest: 05ec8f8ea8075c7273570f3040c515bbcfd036428a16f6ca627e05791eb24f44
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28532
links:
  - type: validates
    target: SCEN-kibi-conservative-requirement-proof
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-conservative-requirement-proof
  required_case_symbols:
    - SYM-test-conservative-requirement-proof-chain
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Verifies the conservative requirement-proof contract through core Prolog, the CLI command surface, and the MCP adapter. It covers structural false positives, complete proof chains, semantic-inventory RDF round trips, refresh-before-extract source-coordinate persistence, executable-versus-production symbol classification, stable proof gaps, ranked repairs, and compatibility of existing coverage fields.
