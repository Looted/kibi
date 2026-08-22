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
---
