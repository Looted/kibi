---
title: Predicate Suggestion Relevance End-to-End Contract
status: active
priority: must
text_ref: packages/mcp/tests/tools/suggest-predicates.test.ts
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-predicate-suggestion-relevance-v1
  required_case_symbols:
    - SYM-kibi-predicate-suggestion-relevance-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-predicate-suggestion-relevance-v1
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-58486d4d8eb94abb97c68702
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:04:36.353Z'
    finished_at: '2026-08-21T08:04:37.770Z'
    artifact_digest: 02a68e51cc19eb0e71ebdbba338ecc1b4494fa60810be815a267930ba69421fa
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: failed
        retries: 0
        duration_ms: 1417
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f82d1499e0ba9492712f6fdc
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:04:58.277Z'
    finished_at: '2026-08-21T08:07:44.533Z'
    artifact_digest: 72e17d33a1bbd4bfb04df65293f5cc75dc850328c449779b4661ca35fe4dd7b5
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: failed
        retries: 0
        duration_ms: 166256
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b3899c39e9a1987b069073eb
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T08:08:08.538Z'
    finished_at: '2026-08-21T08:11:12.603Z'
    artifact_digest: 23502bc4a7d4e589ad5e6eb2c3bfea2175bb0ca14be807d93f116823a447576a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 184065
  - version: kibi.verification-receipt.v2
    receipt_id: VR-97a5b97afbfed733ca73fe8c
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:30:42.684Z'
    finished_at: '2026-08-21T23:31:14.449Z'
    artifact_digest: 76d9055becf72d05570f4c0186c45d59118b6b316eb0e6601b156a08fae47439
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31765
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a387d32aa65fb6845241ecb6
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:05:35.216Z'
    finished_at: '2026-08-22T07:05:56.470Z'
    artifact_digest: fcf19ef86e963aa8cf9c7a0276ee578f571a6c2190754c6aa3344260b3413e75
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21254
  - version: kibi.verification-receipt.v2
    receipt_id: VR-132aeab78e982c6797e0986e
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:07:14.395Z'
    finished_at: '2026-08-22T07:07:34.455Z'
    artifact_digest: f9a726007521b180ecdfca75c50fb73dee2a308225f67275f6c410755a758716
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20060
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2a57ad58935430de6b3e6272
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:24:59.399Z'
    finished_at: '2026-08-22T09:25:17.183Z'
    artifact_digest: 2974631c1b415bc7e66ce7b8855e334249861d17b129382e3e7584ff257e6a05
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17784
  - version: kibi.verification-receipt.v2
    receipt_id: VR-000eb627eb2ff6d4c5d8aa6f
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:26:22.616Z'
    finished_at: '2026-08-22T09:26:41.360Z'
    artifact_digest: eef7d7cd7994d6a68046c69138c6e4570d963c7b86b48022e00c6c3275142031
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 18744
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65d3e6754ce836aaaf8e783d
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:08:44.176Z'
    finished_at: '2026-08-22T10:09:01.747Z'
    artifact_digest: 5aad02f6790277d197e3c06e89ff65ec652b852d67d9431471bb452169537389
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17571
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d31241598fa1384d12650d87
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:10:05.939Z'
    finished_at: '2026-08-22T10:10:22.958Z'
    artifact_digest: 840796e78bcd7165e48b99cc01926ec4171517ecb506f3c6c833041bf6eeb659
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17019
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b38043483372efc284804984
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:02:11.822Z'
    finished_at: '2026-08-22T13:02:27.314Z'
    artifact_digest: 7e8d4bf373b88f8ee1d5427b497f034ad2d18b29e7ec996763efa7b5e5bc185f
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15492
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2463a3818e05249fd13fadfc
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:03:24.092Z'
    finished_at: '2026-08-22T13:03:40.045Z'
    artifact_digest: 360d64db0860ae28bd3698fffe7fa33886f2a4f54954dbc37ea68f9c662cb1a4
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15953
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7e3a529d8e98012fb8eb31cc
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:46:18.018Z'
    finished_at: '2026-08-22T21:46:35.174Z'
    artifact_digest: b1974146c12d9729a17d06124f0fc22a8796c662979ffcae5d235baa9f54c43a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17156
  - version: kibi.verification-receipt.v2
    receipt_id: VR-496c946a49655fa3af61c3bc
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:47:35.889Z'
    finished_at: '2026-08-22T21:47:52.023Z'
    artifact_digest: dbbd732f598706d22b31606d376d060cb6e572c8b5025a7b65285f456df98d99
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16134
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b8ec1cdd1aa70ceb444c6435
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:51:47.586Z'
    finished_at: '2026-08-22T21:52:02.267Z'
    artifact_digest: 8159aa1bc1273783b061f9ab52295b8f404de8468eec71b80c7daabe20ed98d8
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14681
  - version: kibi.verification-receipt.v2
    receipt_id: VR-682f409ffa8508265448556f
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:52:57.748Z'
    finished_at: '2026-08-22T21:53:13.980Z'
    artifact_digest: f0d7fe07e6c059e8d041a85355503fafb79171793b3d0c0ef291d67efbfd63db
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16232
  - version: kibi.verification-receipt.v2
    receipt_id: VR-367c9d58245da4850d8634e0
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:20:33.686Z'
    finished_at: '2026-08-22T22:20:49.711Z'
    artifact_digest: 2b5bdc4199a45968172798671d0e8fec8b6303c56d1203a0e7d2080bcf3fba9b
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16025
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb185b16d5a6a74a5acfda74
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:21:45.307Z'
    finished_at: '2026-08-22T22:22:00.129Z'
    artifact_digest: 49153a3bd2eb78ac8bbb5051c9d3750e0496bbd1be385d2c32beb067e8da910a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14822
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8c366e8538123ab37ee07b44
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:51:43.283Z'
    finished_at: '2026-08-23T07:51:59.377Z'
    artifact_digest: f7776bd72789c7fc37f60c624faaefecadb26979c144873dad60cde7299abe16
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16094
  - version: kibi.verification-receipt.v2
    receipt_id: VR-43e0663a601a532f35cc8133
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:53:06.657Z'
    finished_at: '2026-08-23T07:53:24.653Z'
    artifact_digest: d2229552746892dbeb6e1d769e289fc185451cace64f617973a8c8994cf38ab8
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17996
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6d0f12f7b6c2ed975664dc9e
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:34:57.424Z'
    finished_at: '2026-08-23T08:35:13.547Z'
    artifact_digest: adf3a6953d387f358eeb8228e75aaf5e389e01ff8acf880444ebc3251e94050a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16123
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6e56a3de3b041700ab29269d
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-predicate-suggestion-relevance-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:36:11.909Z'
    finished_at: '2026-08-23T08:36:28.976Z'
    artifact_digest: a38e6f6641c9b8ca8934a9f57cf9dbb79c7717bd857c96cb7121d6c7c3512a4a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17067
---
