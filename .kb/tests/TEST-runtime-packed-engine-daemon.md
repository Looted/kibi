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
---
