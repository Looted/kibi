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
