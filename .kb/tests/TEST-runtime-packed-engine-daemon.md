---
title: Packed runtime engine daemon consumer proof
status: open
tags:
  - runtime
  - engine
  - packed
  - e2e
  - proof
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-runtime-packed-engine-daemon
  required_case_symbols:
    - SYM-test-runtime-engine-daemon
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-runtime-packed-engine-daemon
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3a7ee5c3d4df41db6af775fc
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:09:31.401Z'
    finished_at: '2026-08-22T10:09:38.308Z'
    artifact_digest: 76e1cb8747e7f89efe3d4c2081d60b613b3f6ddb6da706e52e93560745f56bcc
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6907
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f267b8bf11bf9d2a11a89585
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:10:52.001Z'
    finished_at: '2026-08-22T10:10:58.791Z'
    artifact_digest: e04b412335c29af16d2609c2dffa0468f4c049a719d564112eaddb866a0c12da
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6790
  - version: kibi.verification-receipt.v2
    receipt_id: VR-79e5eb07dcfb8e8dd9a73672
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:02:54.122Z'
    finished_at: '2026-08-22T13:03:00.306Z'
    artifact_digest: 898ab380cdf0ec29ae862e053bdeaee8d4028ded710bf2728fe94b70a971d8ee
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6184
  - version: kibi.verification-receipt.v2
    receipt_id: VR-409ea64d685ed9bc3ff6d510
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:04:07.701Z'
    finished_at: '2026-08-22T13:04:14.194Z'
    artifact_digest: 7ced9f3fc78a630cb0b4d479d1be244bcbc1eac96096a10f0efd7dfb3a322bee
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6493
  - version: kibi.verification-receipt.v2
    receipt_id: VR-866badb9382752dc6f395181
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:47:03.360Z'
    finished_at: '2026-08-22T21:47:09.706Z'
    artifact_digest: 96e13716e13b3cbd7f85ad49b1a979d0970288200f51bca417bdb767d3e3d6bf
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6346
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a237a20149e12f1939f0042d
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:48:19.269Z'
    finished_at: '2026-08-22T21:48:25.942Z'
    artifact_digest: 8a8594b699f66ca44a4ffcb77da134591f482aafbe2a4462913c52a055afe450
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6673
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b80b50acdd012f3893644bef
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:52:28.695Z'
    finished_at: '2026-08-22T21:52:35.114Z'
    artifact_digest: fb326f2a365f613dc8bc91bf308c826422bae9b4f973c5cc04f2540f5f6b4d23
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6419
  - version: kibi.verification-receipt.v2
    receipt_id: VR-95066655fc28df09495e768a
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:53:40.562Z'
    finished_at: '2026-08-22T21:53:47.010Z'
    artifact_digest: 48aba8fd13b09fcb54477102241e65e0303b56ecff6dd96feb32dfd4df4f9794
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6448
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7c605edf680d51bbdad45abe
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:21:16.043Z'
    finished_at: '2026-08-22T22:21:22.471Z'
    artifact_digest: 177d66c85a1e059233f1b54566077c932e382d97a73395947c6a58529e47eff9
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6428
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2c5e066099061a020842cf6b
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:22:28.025Z'
    finished_at: '2026-08-22T22:22:33.071Z'
    artifact_digest: facc75684634e2363e289ebf98365256e7b083195aaab4a10d67697d24264a3a
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5046
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cd2d3bbd2f62e15c93b0ff05
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:52:31.028Z'
    finished_at: '2026-08-23T07:52:38.778Z'
    artifact_digest: 2b16a618f7a121bff8b43e25ab5161acdf6af0c9f9f84c6689fb03d5b5481f27
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7750
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dae705d2a4b8cf0161389ee5
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:54:01.478Z'
    finished_at: '2026-08-23T07:54:11.775Z'
    artifact_digest: a35b25b75fb55d7765db35266b0df0a2ac07384abe4a6153d5f4d0a1e3af14c8
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10297
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e2bee55f43dbf3969abd5724
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:35:40.217Z'
    finished_at: '2026-08-23T08:35:46.680Z'
    artifact_digest: cb27a8dac1e885ebbde1e516cb44f0324ae41f475957c15d4988671542bffde9
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6463
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9cb053a084712057dc9fcc06
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:36:57.253Z'
    finished_at: '2026-08-23T08:37:03.632Z'
    artifact_digest: af20309acddc788fc13288fa7eae01b15763deae25e799100e3ad3d67d55655c
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6379
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3b2df0921eca73e5df78a468
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:32:08.440Z'
    finished_at: '2026-08-23T12:32:14.934Z'
    artifact_digest: c5c10a927932f01970220159f603eaefe2d3b13d247f96748e63ef182c22521d
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6494
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9b966f2d4b70ff7bf33a0326
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:33:21.649Z'
    finished_at: '2026-08-23T12:33:27.820Z'
    artifact_digest: 53054c474e57151aac71921b3440f4faf7c98e22d115406d2bb3a6f203999236
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6171
  - version: kibi.verification-receipt.v2
    receipt_id: VR-10bac68d448cc46157571e2c
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:32:24.363Z'
    finished_at: '2026-08-23T19:32:30.765Z'
    artifact_digest: 6959854c4b2c2b6e3540233524d6f7724b25ec8f4189380a3503ab95becb91bf
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6402
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e942530d8f3e66dc9d5654ca
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:33:36.234Z'
    finished_at: '2026-08-23T19:33:42.478Z'
    artifact_digest: 3d0067235fd3c156e97987f6eb9e9ea1ef3ced4bfa8784fb21d5ff3d64417b65
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6244
  - version: kibi.verification-receipt.v2
    receipt_id: VR-065ab00cb966bb98f514e295
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:58:36.412Z'
    finished_at: '2026-08-23T19:58:42.700Z'
    artifact_digest: 194315aed20eae0c42e71cd92edecbcdb32bd0ef697458a13abd32e334d167db
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6288
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a104df07d6a6e5e9d875e02d
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:59:48.028Z'
    finished_at: '2026-08-23T19:59:54.343Z'
    artifact_digest: c245b3d0286f26c1b4432efffbaa2791e92505f9a4ef4ba9616940a15d593fce
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6315
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6b947e65b5e90990012ddcdd
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:26:01.613Z'
    finished_at: '2026-08-23T20:26:08.126Z'
    artifact_digest: d3357a9fca5ec0fe1c7ed49a91ec80a5f36f811095c28c82a9a01a43bdb5a9b1
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6513
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8e4872f95e8df8f23ca7f2f8
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:27:13.422Z'
    finished_at: '2026-08-23T20:27:19.578Z'
    artifact_digest: db1a4c5cd30fcaab284eef3d1c8ab8c43c22c28f1a44fa3b783b0ed23d849bb5
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6156
  - version: kibi.verification-receipt.v2
    receipt_id: VR-54b7ae2dde6b79d16fecb8c8
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:52:04.869Z'
    finished_at: '2026-08-23T20:52:10.828Z'
    artifact_digest: 1e3a68c6e592334feeba93ffb012ad1e13b83850e1d80aa7941c197b0306fac8
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5959
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d13814e062302dc508868454
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:53:13.384Z'
    finished_at: '2026-08-23T20:53:19.448Z'
    artifact_digest: fd4b37785b9f647f1d1e6c05d5c5c4ac568fed508894da02e15a425454a85c7a
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6064
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fd53bd375aab7a37be6924be
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:32:29.933Z'
    finished_at: '2026-08-23T22:32:35.818Z'
    artifact_digest: baa3e56105c2cb453e329e247770470e0a5bdc94e651635c168343c574ee5ea6
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5885
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4b9c12ad289519e02e958f68
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:33:37.454Z'
    finished_at: '2026-08-23T22:33:43.475Z'
    artifact_digest: c52453ca87661557f3deac8c7eaa425c1fb1b7eefbdba47be747d6634db109f3
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6021
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a1bf894e87c50e12e86badef
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:58:51.393Z'
    finished_at: '2026-08-23T22:58:57.170Z'
    artifact_digest: abd5727ac57da4ff57dfe031f8b9862e9e936c4222ef7863316a162bbb60616e
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5777
  - version: kibi.verification-receipt.v2
    receipt_id: VR-79cca0c11a414fadb450331e
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:59:59.740Z'
    finished_at: '2026-08-23T23:00:05.697Z'
    artifact_digest: 02a8495172b2a5c94a0f5fd3e1d8f40cb2f9a19dfbb4266ea9d4b36a1464f07e
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5957
  - version: kibi.verification-receipt.v2
    receipt_id: VR-51b96d83e6adeb3ef417c38c
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:47:29.623Z'
    finished_at: '2026-08-24T06:47:36.229Z'
    artifact_digest: 8391d47b09d36ffc53d89c13584424db6c760d8e051e84630a06e5d87d1ff4e3
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6606
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eb931e78682a1caecf6133d2
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:48:54.190Z'
    finished_at: '2026-08-24T06:49:02.654Z'
    artifact_digest: f0a2eee4efbd682d1d29aa4acfee3ba036eddca7880131b8ded2f1ee5445bb9a
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8464
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4da23d6a06b97302b342e095
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:14:17.679Z'
    finished_at: '2026-08-24T07:14:24.112Z'
    artifact_digest: 71c534b1b5d97b641b76096d1b04d4989421a61e4c4e18660f0ccf4aace69066
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6433
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e857ddedfcd86385dba6fea7
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:15:30.580Z'
    finished_at: '2026-08-24T07:15:36.957Z'
    artifact_digest: 89702379c40c2ca2344e92ee2d93c03b7fddd399b7f26c46a9b1b95b9b585512
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6377
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0161d168aa4995fd50a96776
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:10:51.123Z'
    finished_at: '2026-08-24T08:10:58.553Z'
    artifact_digest: 38910833b3e65e35d8a7fc5846a29142f103bf829d48e3f57abad9407a8180cb
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7430
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f0adc131a1682e7fd178b130
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:12:28.148Z'
    finished_at: '2026-08-24T08:12:35.621Z'
    artifact_digest: d053ee8fd9fe766124230c18ed249ddfa435f16fb9a2eb6361ece3ce2c1f5a03
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7473
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ff491b8dd2bc869adf082973
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:42:45.910Z'
    finished_at: '2026-08-24T08:42:52.959Z'
    artifact_digest: e16d57e77fb97912f1b7ff7f5156dfff507824f599e0f6fd357d111584ed2c62
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7049
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d867f464d3c1fc3cbe84f2a0
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:44:10.181Z'
    finished_at: '2026-08-24T08:44:17.027Z'
    artifact_digest: 87676e5b240a91d191ee54f19ef81963cd72fa7c9cd38f20082a8106e6a0e9a1
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6846
  - version: kibi.verification-receipt.v2
    receipt_id: VR-84109fdac286f57ded6a3d20
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:12:49.194Z'
    finished_at: '2026-08-24T09:12:57.512Z'
    artifact_digest: fec7b04283eedb9e5fae6048882e815790711ffe65785cf72378cb50146ed1e2
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8318
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c4132bf4e54bd28bf49aad74
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:14:17.611Z'
    finished_at: '2026-08-24T09:14:24.998Z'
    artifact_digest: 4c5dee72d42666e1e0ec86b8aa3c2ae471253fb3ba83f539f8c62aeb7a150944
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7387
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f3533a6497df08b4f87f0ecb
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:24:12.567Z'
    finished_at: '2026-08-25T21:24:18.599Z'
    artifact_digest: 169f0951d72d78e7636f5a2487203dc30380b8ef9436dfff1ecb5811cb233f4d
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6032
  - version: kibi.verification-receipt.v2
    receipt_id: VR-953fce2b4aaa7922a19f1c2e
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:25:24.351Z'
    finished_at: '2026-08-25T21:25:30.295Z'
    artifact_digest: 72e7eea1aca993f4ae0a3753ca93c8fe97beda37c3d62ffd4456cefbd4f89174
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5944
  - version: kibi.verification-receipt.v2
    receipt_id: VR-29f7b8086f3945a993b2913b
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:15:02.613Z'
    finished_at: '2026-08-25T22:16:09.821Z'
    artifact_digest: a72ef3bc119c6129bdc632544c9e5145ccda73aa22295b42883d295f3f53baca
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67208
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f08ab82cb904eeaafa819857
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:18:17.165Z'
    finished_at: '2026-08-26T14:19:19.118Z'
    artifact_digest: 96cb0a5ec594c8f1d2609f9efcd17e08a90a6707d208c8355b629d4ccb5d4881
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 61953
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4eb4997394c4b7d88dad28c1
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:38:02.861Z'
    finished_at: '2026-08-28T10:39:08.874Z'
    artifact_digest: d6297f6295fc63cb71930f6d664f72e7bb8fe9813071a46491a02902d2a04afd
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 66013
  - version: kibi.verification-receipt.v2
    receipt_id: VR-949437eaf698f8b509d53c5f
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:44:34.676Z'
    finished_at: '2026-08-28T13:45:35.062Z'
    artifact_digest: 1febff171006543c3350469a087637fbbc673e0f6db0a93dc207f0168c9b0838
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 60386
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc3cf98f56c4daa4cf01f886
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:28:13.880Z'
    finished_at: '2026-08-29T01:29:17.545Z'
    artifact_digest: 1def1b21be983b9e18acca4cd8722fc375681ebeec8954471a816550f6ac2999
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 63665
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f3d6c97b61cbb6c8eb151e9f
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:31:18.090Z'
    finished_at: '2026-08-29T07:31:55.244Z'
    artifact_digest: 8656c3e92cbf66070fc0818e1d12db2434d1cb8ea6245a53b24ab6c8619cd8b0
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 37154
  - version: kibi.verification-receipt.v2
    receipt_id: VR-583acda4c7de5beb620d7f74
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:45:35.343Z'
    finished_at: '2026-08-29T07:46:12.015Z'
    artifact_digest: fa10b8aadc0df587242e4483660d1addd164c9dc7cea618cd84f4f9c68eebe75
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36672
  - version: kibi.verification-receipt.v2
    receipt_id: VR-94bfa683b24551c0b10dda1d
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:15:24.708Z'
    finished_at: '2026-08-29T08:16:00.175Z'
    artifact_digest: 482f973e0524e8847ad6421d97471ee9e040f1a75bcd9fe25812ee7c41f0cbc2
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35467
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6000a5472fe407f0fef8ee70
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:46:46.792Z'
    finished_at: '2026-08-29T08:47:22.436Z'
    artifact_digest: ec6d60476766a4713df015c8d05fda3d2f994a03b1c9ee5af33f515b209310a3
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35644
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ec3da2b2a5463a1884307889
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:35:48.926Z'
    finished_at: '2026-08-29T09:36:24.661Z'
    artifact_digest: e056ea351fa5cde138e9a774c81ace3948742acb94d7533dec1b0cef20637034
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35735
---
