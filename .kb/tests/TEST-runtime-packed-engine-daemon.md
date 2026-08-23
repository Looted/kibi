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
    receipt_id: VR-bf51245666b2f4450374003d
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:52:15.466Z'
    finished_at: '2026-08-21T23:52:24.913Z'
    artifact_digest: 03f4910e486af5a6728334af9b07ccb90241a0a74d9c795b07a3ff8634df2101
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9447
  - version: kibi.verification-receipt.v2
    receipt_id: VR-77ac279c8c14031b2180c043
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:53:06.392Z'
    finished_at: '2026-08-21T23:53:14.836Z'
    artifact_digest: b9c52569fdc0b908eb2f1e09ac3044d45713c4c5e102630d340d1979c1cefc6a
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8444
  - version: kibi.verification-receipt.v2
    receipt_id: VR-170a585018f361694d6dc313
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:06:32.923Z'
    finished_at: '2026-08-22T07:06:41.167Z'
    artifact_digest: aa1c042749e398ae288a106b7a3f2b5e62b8a3f1e938be6177ed20233f214b20
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8244
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7e338ab7461d14729db7a81b
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:08:10.008Z'
    finished_at: '2026-08-22T07:08:16.881Z'
    artifact_digest: 4a6b7e229d907c5cdff3c368fc96e17549a8b48858fa2d93feb43ee8de989edd
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6873
  - version: kibi.verification-receipt.v2
    receipt_id: VR-547c85defeca58838caf7211
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
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:25:48.361Z'
    finished_at: '2026-08-22T09:25:55.128Z'
    artifact_digest: 9d497bce131586b39a7fe745de53bdefa1b23552acb4e03a8c8bbffa53ea171e
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6767
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3ada1b14848020316b1d9646
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
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:27:16.942Z'
    finished_at: '2026-08-22T09:27:24.582Z'
    artifact_digest: 65aab1c344f45c760cd76e15d5566b6fc9565040d5e03060fa0bb82316af9482
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7640
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
---
