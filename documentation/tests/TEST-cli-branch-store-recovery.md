---
id: TEST-cli-branch-store-recovery
title: CLI exact branch-store recovery contract
status: active
tags:
  - cli
  - branching
  - recovery
source: packages/cli/tests/commands/branch.test.ts
links:
  - type: validates
    target: SCEN-branch-store-recovery
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-cli-branch-store-recovery
  required_case_symbols:
    - SYM-test-packed-exact-branch-recovery
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1cc71130fe430e7696e731a6
    test_id: TEST-cli-branch-store-recovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cli-branch-store-recovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cli-branch-store-recovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:05:08.320Z'
    finished_at: '2026-08-17T12:05:44.502Z'
    artifact_digest: bb5da3956d976910414d1da1028dc7ca970912a41d3919d2076314f21c70dd65
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36182
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ef7b3303b8e0b98bb0eaded9
    test_id: TEST-cli-branch-store-recovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cli-branch-store-recovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cli-branch-store-recovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:55:15.211Z'
    finished_at: '2026-08-17T20:55:58.001Z'
    artifact_digest: 39943902e7fce4a9d813645638f7ed406e82e4a1da57fd1dffce09f9c51bf57a
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42790
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b4963871dbd8e8dd19014d3f
    test_id: TEST-cli-branch-store-recovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cli-branch-store-recovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cli-branch-store-recovery
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:09:31.420Z'
    finished_at: '2026-08-18T07:10:13.574Z'
    artifact_digest: 767dc9561dd7dafcdae0cf2ec475655360207c45394fcc53b5b3617d851ee6fb
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42154
---
The CLI branch and packed consumer tests prove that same-identity literal-to-hashed migration remains available, every cross-identity pair (including main to master) is refused, and explicitly applied recovery preserves a backup and returns a fresh exact branch store.
