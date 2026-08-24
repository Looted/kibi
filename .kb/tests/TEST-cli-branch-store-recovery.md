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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4891fd570f8dbc5e3107c907
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
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:03:31.606Z'
    finished_at: '2026-08-22T21:03:43.613Z'
    artifact_digest: 44dc8f015a478a0c90bea5dc638902ce922c8815413b50a5f2310a65f5b79a37
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12007
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1e850474bf5fb56deb1c7861
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
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:30:00.751Z'
    finished_at: '2026-08-22T21:30:14.410Z'
    artifact_digest: 668fae8b5c1d8a1611c06b888be18f6cb0c206cde2bc0b3d1f6c0441d622e5fb
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13659
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f25d97990bddc46abed25719
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
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:00:36.388Z'
    finished_at: '2026-08-22T22:00:47.667Z'
    artifact_digest: ff21819c3e7ce2cb45424932d9009d3999aec051739c2dd6b1d69751e9e98263
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11279
  - version: kibi.verification-receipt.v2
    receipt_id: VR-52cae2548281e0b6718ef68d
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
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:30:30.406Z'
    finished_at: '2026-08-23T07:30:41.523Z'
    artifact_digest: 31b7e86ad5af2721c7e171bb1642561eb534584ea3238b591596ebe2b1bfb5f8
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11117
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9b2d153e2ed56e3b48de2c72
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
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:14:06.044Z'
    finished_at: '2026-08-23T08:14:17.137Z'
    artifact_digest: 0b7b12065e348ef8a7ca04121b6dc74d7d9d423378bfc49c15248ae14ac92e4a
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11093
  - version: kibi.verification-receipt.v2
    receipt_id: VR-21438b95b3e0d0e62dd6e72c
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:11:19.338Z'
    finished_at: '2026-08-23T12:11:30.134Z'
    artifact_digest: c409a214d5979e1b0dc9bb5ffd13a27bcb968cd902e3c2c044012ee96365afc9
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10796
  - version: kibi.verification-receipt.v2
    receipt_id: VR-12ea81fdf73a7d139f339fdc
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:11:04.008Z'
    finished_at: '2026-08-23T19:11:15.194Z'
    artifact_digest: 3b869bb4989302967e7e7e8d69c0d5c8c0c44af5e016b6f6fdced4d2e9aa8efb
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11186
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4902a88c2e036c779ad9e4d2
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:37:12.530Z'
    finished_at: '2026-08-23T19:37:23.600Z'
    artifact_digest: 981b9ab5263554599422a2c037e759f07d32f43be34a7de60af87ccd0fa05a7b
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11070
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed160993be175411cec52dcd
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:05:08.917Z'
    finished_at: '2026-08-23T20:05:19.782Z'
    artifact_digest: 83b80818934b865643b4cdcb3bca4efd0ac4ba038721fc4f9cb2bb75544a4cda
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10865
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c9c9d60db449daabe31f512a
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:31:28.669Z'
    finished_at: '2026-08-23T20:31:39.698Z'
    artifact_digest: d838c8786ff4d9c4d7b717d3ece8f8a4f53ed328dd0e75997e6b6116798ed901
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11029
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2b3e09e0eef02423cc584cd6
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:12:24.103Z'
    finished_at: '2026-08-23T22:12:34.528Z'
    artifact_digest: a601b223a2e5fb948cc51d3449549099f22bb5723f91fcfbbb726ea613189382
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10425
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c7deddf2b0227fab8dc00ace
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:38:33.401Z'
    finished_at: '2026-08-23T22:38:43.992Z'
    artifact_digest: 68b39b1c00b73abc671631f8ae3475740dcc7d75215a10447f7fa8a2a5cc6562
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10591
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e8b92fe33a51fbd2795fdd50
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:23:48.947Z'
    finished_at: '2026-08-24T06:24:00.483Z'
    artifact_digest: c96a303c12657770d03171ac16632528a447ab360e9e1438282802a044fc9ce9
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11536
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9e6279b047da5492b9af5b1b
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:51:54.440Z'
    finished_at: '2026-08-24T06:52:05.821Z'
    artifact_digest: e59f2e3afc926dc18847c3b0e56c5d8d4d9b4cba6da38b8f0fbba9b399b72af3
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11381
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8bebab0207406e111f0c3976
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:22:02.291Z'
    finished_at: '2026-08-24T07:22:13.162Z'
    artifact_digest: 796ad5facd0fb0aa11296f2fdabb82d07680279c14d54bf9a02d4aa2f6350056
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10871
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8bef998ad724f577d4d70b7b
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:46:33.468Z'
    finished_at: '2026-08-24T07:46:48.314Z'
    artifact_digest: ea2d0e36b9d466f65ea33e51efce183550c5e577f1f819703a7242872e0fb72c
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14846
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c1d5d230d03f5e899fbb3ab4
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:18:56.013Z'
    finished_at: '2026-08-24T08:19:07.229Z'
    artifact_digest: 3b70c105b5feca15acbd3b3e72caa2a625a4ef0255b119b5642c10766c249ae3
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11216
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2d7a1bb4a77d390c22d829cb
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:48:23.515Z'
    finished_at: '2026-08-24T08:48:35.304Z'
    artifact_digest: e3bf7cb56811a8214065253e3607bb84511a72d0bc90357cbd4c128e9c0e7f27
    contract_hash: 9a973eb1511c1857a8910cd47b851b302469d5aaa942f8b8594d982cffa30317
    case_results:
      - symbol_id: SYM-test-packed-exact-branch-recovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11789
---
The CLI branch and packed consumer tests prove that same-identity literal-to-hashed migration remains available, every cross-identity pair (including main to master) is refused, and explicitly applied recovery preserves a backup and returns a fresh exact branch store.
