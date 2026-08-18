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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bbc9fea734c85fc8b374fabc
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
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:18:20.386Z'
    finished_at: '2026-08-16T21:18:57.173Z'
    artifact_digest: 4d45112f941587f37cf8cc63977f37df7f1b59a06be2df540fd5564ca372cad6
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36787
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3163b408efd2430cabac12f0
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
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:44:20.224Z'
    finished_at: '2026-08-16T21:44:46.940Z'
    artifact_digest: c2c0eef513cac4173da529aaedae7002c15f58ec7ea8444aaf4c6f3f693f7e83
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 26716
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7c294863522400f8ece49cf
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
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:06:41.820Z'
    finished_at: '2026-08-17T12:07:12.919Z'
    artifact_digest: b305434b4ebfae99c34c091c9d656e2ea8b9399562ca7b2cec074ca0ba0837f4
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31099
  - version: kibi.verification-receipt.v2
    receipt_id: VR-17d80e79783b026a2e41328a
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
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:57:00.410Z'
    finished_at: '2026-08-17T20:57:32.204Z'
    artifact_digest: 381f6b89b675b9ae0b7622b23e2b3ca5298b2f3c5e7d2e792bb2aeebb8b34ca6
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31794
  - version: kibi.verification-receipt.v2
    receipt_id: VR-60c4f0a754d09dfe35c71ef8
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
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:11:16.275Z'
    finished_at: '2026-08-18T07:11:49.134Z'
    artifact_digest: b0aba8c5989b6b5d642487fc910ebffc9bae05b348d4540e145a6aea5305c21b
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 32859
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a8aba9a321489a8c62b4531e
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
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:39:44.869Z'
    finished_at: '2026-08-18T10:40:18.113Z'
    artifact_digest: 5be43a534b81b7283b002fddd00164647dfa99009baf0e4e3843f6ed8617da98
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33244
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
