---
id: TEST-kibi-dependency-ordered-repair-plan
title: Packed dependency-ordered repair plan tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-dependency-ordered-repair-plan.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-REPAIR-PLAN-20260810-01
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/dependency-ordered-repair-plan.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 68131fba9962716408e6bf6aa60dfc87b86a6c4eacdf83e623edd51ecf2714b8
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: '2026-08-10T18:20:28.253Z'
    finished_at: '2026-08-10T18:20:59.811Z'
    artifact_digest: 1ab7494688bc1609e7ba32a26b73af1ea6c93de6ff4d9316f5c1ae495af940e2
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1f63afee87b3b50448602253
    test_id: TEST-kibi-dependency-ordered-repair-plan
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-dependency-ordered-repair-plan
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T18:59:59.477Z'
    finished_at: '2026-08-16T19:00:52.008Z'
    artifact_digest: c0c0899ee014b3f1558a1c75f94f07037c2256ad095a63600d054320018a9e04
    contract_hash: d43e430d659807bd75415740e9e35956c73ebac70f8b23b8c18f9ce1a42ba4c3
    case_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        project: default
        outcome: passed
        retries: 0
        duration_ms: 52531
tags:
  - requirements
  - proof
  - repair
  - migration
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-dependency-ordered-repair-plan
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-dependency-ordered-repair-plan
  required_case_symbols:
    - SYM-test-packed-dependency-ordered-repair-plan
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises `kibi.repair-plan.v1` through a fresh packed CLI installation, including dependency ordering, pagination fail-closed behavior, stable plan identity, requirement-only scope, table rendering, and read-only KB state.
