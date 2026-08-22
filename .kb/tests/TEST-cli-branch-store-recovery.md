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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fc22b6fb595998644126d1f7
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
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:37:50.386Z'
    finished_at: '2026-08-18T10:38:36.756Z'
    artifact_digest: 9814512f43cfd771137b3995dfbcc458a5e22ae69d8d89a8708a3d02a1118b77
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46370
  - version: kibi.verification-receipt.v2
    receipt_id: VR-be9474e6237e9829db8f3d7e
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
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:49:15.698Z'
    finished_at: '2026-08-21T21:49:28.863Z'
    artifact_digest: 4a18b34e9db37b11d4d83d1cb13d8197ce01c7efdcfd05aa31d683b245b4e7c6
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13165
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4666f426118f952d0a5eaf1e
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
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:04:41.482Z'
    finished_at: '2026-08-21T22:04:54.982Z'
    artifact_digest: bedcf95f7d2d2426f971636eb3a73c6a35113defaa39d977bf9a2fc52e3e8dfb
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13500
  - version: kibi.verification-receipt.v2
    receipt_id: VR-95387698d1309d236df57c1f
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:54:04.978Z'
    finished_at: '2026-08-22T00:54:22.751Z'
    artifact_digest: 14255c9e6fdcfda8c6c2120cdf3ad3dcc3a80358aa65a3adb8a4b66f3c039b4f
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17773
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5772d4fbfab5e7287f1f540a
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
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:57:04.965Z'
    finished_at: '2026-08-22T07:57:17.865Z'
    artifact_digest: 06bbe7155418562e5477f23672c9d194e1308d66df4445133ea4421afa881e4c
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12900
  - version: kibi.verification-receipt.v2
    receipt_id: VR-106d5a1c1bdde948a164a400
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
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:45:15.835Z'
    finished_at: '2026-08-22T09:45:34.964Z'
    artifact_digest: 742f9e24432aba17bcf733e43c9b2f15741298fd3e889687ea6b056576e37b97
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19129
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4e069e98f138ddc6aa75016a
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
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:41:48.709Z'
    finished_at: '2026-08-22T12:41:59.677Z'
    artifact_digest: b7952307293fd8cf4f000277d999afe1f3b5b3fdd2b79e8b71ac90366eb98191
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10968
---
The CLI branch and packed consumer tests prove that same-identity literal-to-hashed migration remains available, every cross-identity pair (including main to master) is refused, and explicitly applied recovery preserves a backup and returns a fresh exact branch store.
