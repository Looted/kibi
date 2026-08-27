---
id: TEST-core-journaled-engine-delta-sync
title: Delta sync and performance gates
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - sync
  - performance
links:
  - type: validates
    target: SCEN-core-journaled-engine-delta-sync
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-core-journaled-engine-delta-sync
  required_case_symbols:
    - SYM-test-core-journaled-engine-delta-sync
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-570ec029b47ddcd4b1d70cbc
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:47:56.387Z'
    finished_at: '2026-08-16T19:49:05.803Z'
    artifact_digest: f1098806e30e03ab4b6d89f25122820a35267594883c1cfaa83fa7253d6ba0fe
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 69416
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5a36a4df7056d716d798bc42
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:05:15.732Z'
    finished_at: '2026-08-16T22:06:35.338Z'
    artifact_digest: 1c0433b6681447794cfb68b4f4cd038da4475cea3066b29cd08c97828fe9a9a1
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79606
  - version: kibi.verification-receipt.v2
    receipt_id: VR-49b5b9de66f7ebe39df8b1b9
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:25:38.990Z'
    finished_at: '2026-08-17T12:26:48.313Z'
    artifact_digest: 96dbcf94ffa49450667c80679e5149dfbf50b5b9e266660e3d804fb2fa2f0d0c
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 69323
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a81b42203208e26d71fc252c
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:18:19.825Z'
    finished_at: '2026-08-17T21:19:30.226Z'
    artifact_digest: ab54606a3293bc9ee4e60988931a2d2e1d5caac931a2084af15525b38fa9a1c1
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70401
  - version: kibi.verification-receipt.v2
    receipt_id: VR-70c1fa3ec255b3754b98bf5b
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:33:53.268Z'
    finished_at: '2026-08-18T07:35:07.391Z'
    artifact_digest: 60bbc1079ec4891c75a68c0c5670ebbdb385da08757f661cca07b322e8e1dda4
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74123
  - version: kibi.verification-receipt.v2
    receipt_id: VR-203c599b8209639e4d480fbd
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:33:40.470Z'
    finished_at: '2026-08-18T10:34:53.868Z'
    artifact_digest: c4582395a5d18cba33edb935ffaf9d5270ceae7d52f233bbc157f398236594cc
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 73398
  - version: kibi.verification-receipt.v2
    receipt_id: VR-26b7e89c9df59d7b636e79a9
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:56:22.901Z'
    finished_at: '2026-08-21T22:57:56.586Z'
    artifact_digest: 3c980aa680e095af4da0e7b55810db8fdbc4194d22300a254087d5a8bb2a2eb8
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 93685
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c9c2c135ff778e64fa2c21bd
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:22:17.642Z'
    finished_at: '2026-08-22T01:24:24.329Z'
    artifact_digest: 712e2db050084c000c57ab6c9d6c0a1950ddf056ad1a0ceeeca43f726e61b7cf
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 126687
  - version: kibi.verification-receipt.v2
    receipt_id: VR-51c75fde0ecc56a410fbeb6f
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:24:05.657Z'
    finished_at: '2026-08-22T08:26:04.914Z'
    artifact_digest: 3482edd4b755aa4814354c7016d0c85fc41b10eecf97615fc7a73661467a450f
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 119257
  - version: kibi.verification-receipt.v2
    receipt_id: VR-88a9452ce63a0ea094810543
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:05:09.660Z'
    finished_at: '2026-08-22T10:06:37.331Z'
    artifact_digest: bc2911a6cdbf532a708bea3de2192896b6f35231305401cb042c2b0bbfe2e427
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 87671
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2ed6d3ef2a623148f67e4094
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:59:00.501Z'
    finished_at: '2026-08-22T13:00:18.740Z'
    artifact_digest: 19069ae3e550c071ca2828e900505387a338d1f1655e256ca617a19aab1d0849
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78239
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d7f2331128f7f120d352adfe
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:43:03.028Z'
    finished_at: '2026-08-22T21:44:21.884Z'
    artifact_digest: a8d1e3ba74fc02dce5e8afb568dcec73f6908f4f0f7a274c074e648c464f296e
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78856
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9521d5c60b2ff654c939a8d7
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:48:37.789Z'
    finished_at: '2026-08-22T21:49:56.304Z'
    artifact_digest: b01803a886c19644278a8aca5b0c140e7ccdae1ed731cff5aa273b67f8846cd8
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78515
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a85ee04b73d0f2e9e154baa1
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:17:25.664Z'
    finished_at: '2026-08-22T22:18:42.551Z'
    artifact_digest: 75b315849eb4c1ca54b6695e4139450c59794ea1831adc9aced22063df607790
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76887
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ef005c397ad2ddc29be692b
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:48:00.893Z'
    finished_at: '2026-08-23T07:49:22.799Z'
    artifact_digest: 1627944d4000b57f883dfded40b24831a9a02b73024f7b2ad31cfa6fe8ecd3dc
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 81906
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1a4ec2ced4f0a930d0920709
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:31:33.037Z'
    finished_at: '2026-08-23T08:32:51.597Z'
    artifact_digest: 2273446d15af513faf076f7c6b14dcecaeea31d9b86ebbce2811c7569ba7ff09
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78560
  - version: kibi.verification-receipt.v2
    receipt_id: VR-03006acae2d93ec31ce3540f
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:28:11.201Z'
    finished_at: '2026-08-23T12:29:29.144Z'
    artifact_digest: 59171fa38df97ff1142313a1e5840c135f9e47fd6528fe37e2e8f2955ef9022d
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 77943
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7ecef78b1f4a4d679159a0a9
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:28:23.588Z'
    finished_at: '2026-08-23T19:29:45.849Z'
    artifact_digest: b9d9aedb6de64287c2b9cc75aa8e61447df7cc2b5c7102527898b82ab6fa4bc5
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 82261
  - version: kibi.verification-receipt.v2
    receipt_id: VR-744f744c60d6ff3278f0b293
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:54:40.432Z'
    finished_at: '2026-08-23T19:55:59.139Z'
    artifact_digest: 35eaeb045adc7b77cdcac1303f2d114b64ce12d4f4174a7c23674070964fad57
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78707
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d760bdb5cafb2f8ae278e950
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:22:10.971Z'
    finished_at: '2026-08-23T20:23:28.535Z'
    artifact_digest: 4db8ad98dabaa5dc4234b69454385d02723510b293e90ac82bfde499310ed67d
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 77564
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c6d6e8ed91c51da2bfa3c571
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:48:21.578Z'
    finished_at: '2026-08-23T20:49:37.096Z'
    artifact_digest: 7ac1b9341fa793e28db18a18b8a6d3cca68e78793a9fc13e9f9b6a944ba946c1
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75518
  - version: kibi.verification-receipt.v2
    receipt_id: VR-04435a23e5c0d16b0d606d48
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:28:47.641Z'
    finished_at: '2026-08-23T22:30:03.469Z'
    artifact_digest: 5a972b229fc58627b68bcbd40a56c6b0f7b90e180889d42c97bd23056c6948e5
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75828
  - version: kibi.verification-receipt.v2
    receipt_id: VR-04367feda53a1d93c211b790
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:55:05.745Z'
    finished_at: '2026-08-23T22:56:22.687Z'
    artifact_digest: 848eb8541291f0f63a0a0516a8aab23222fe91bad0865860cd06d2f47f041b2f
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76942
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3190abbbe9800623d855054f
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:42:39.662Z'
    finished_at: '2026-08-24T06:44:15.424Z'
    artifact_digest: 0564bd53d525565662447620ccc5d247aef7cc6f39386d675b7ca9e1bc47b727
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 95762
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3f63f3a5c2dfb8149d699869
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:10:10.858Z'
    finished_at: '2026-08-24T07:11:31.850Z'
    artifact_digest: 1e28a35d211a8a3afe205757b14b801549789a7ff99c2f64b152955e97027429
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 80992
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c03d2358dbc5b0754326328e
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:40:31.371Z'
    finished_at: '2026-08-24T07:42:01.101Z'
    artifact_digest: 20831614ecb655e93aa84c0dc6a9697bb58147ec6339cf6d7a3a7173819c8335
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 89730
  - version: kibi.verification-receipt.v2
    receipt_id: VR-aea50bec8a190f024ca269b9
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:05:42.813Z'
    finished_at: '2026-08-24T08:07:16.048Z'
    artifact_digest: 42ce85670388184ee5a8bf982792f382c643515ab0577cd70893bb746d629edf
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 93235
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6608a75cfe1eac182628f8e3
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:38:20.397Z'
    finished_at: '2026-08-24T08:39:51.389Z'
    artifact_digest: bff5513a74eb40c87910d8a0d50cf503333976c5e289d9e6bbf50765e8af6c14
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 90992
  - version: kibi.verification-receipt.v2
    receipt_id: VR-42533a8d756850d40e62c971
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:08:20.013Z'
    finished_at: '2026-08-24T09:09:56.361Z'
    artifact_digest: fdbce3dc74b9d00fa57443727ff2956959b7748d18ba190022bdc951b271d58b
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 96348
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fe18332327b06e5604578160
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:20:20.561Z'
    finished_at: '2026-08-25T21:21:38.364Z'
    artifact_digest: 4d3d18266ca6a1fc7dccff0e97dae8d64c0c0322b40bba90a1d6a2273bf4215e
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 77803
  - version: kibi.verification-receipt.v2
    receipt_id: VR-094e451628f6e4dd24b3b27d
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:04:43.901Z'
    finished_at: '2026-08-25T22:05:59.735Z'
    artifact_digest: d066b6887cdff804911f77f8b03de1ee239dcaf35bf0631080991dda2a1a5be3
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75834
  - version: kibi.verification-receipt.v2
    receipt_id: VR-38938e4d1fe207f580e29041
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:08:00.225Z'
    finished_at: '2026-08-26T14:09:16.666Z'
    artifact_digest: 689272b65a4347b341f5d907ad28d8b49aca391fc9ae3d4349cdf55c91a31db3
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76441
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3b2f768345c1db1da9cd1bd7
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:00:46.995Z'
    finished_at: '2026-08-26T16:02:06.192Z'
    artifact_digest: 387b795464da719d4be4346a09dabc76490be6e8c63ab5e2169d926d6423e1f8
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79197
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7a187e1ba76e5f640b4c918
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:02:11.332Z'
    finished_at: '2026-08-26T17:03:29.595Z'
    artifact_digest: 9da259e36c3c2b6c8a9ed66eb3d6f113725d6121ebbde04f0bf4e771aa568a08
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78263
---

Contract fixtures cover no-op, one-symbol, relationship-only, deletion,
coordinate-only, and rebuild sync paths through the Node CLI and MCP.
The generated 10,000-symbol/30,000-edge fixture excludes setup from timed
regions and enforces every release gate: warm exact and paginated query p95 at
or below 100 ms; warm search and status p95 at or below 150 ms; ordinary
durable upsert p95 at or below 500 ms; no-op sync at or below 500 ms;
one-symbol sync p95 below one second; cold attach plus index build at or below
three seconds; full sync at or below 30 seconds; and steady-state engine RSS at
or below 512 MiB.
