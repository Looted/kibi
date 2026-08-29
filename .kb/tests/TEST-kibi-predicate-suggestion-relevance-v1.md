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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-50583bbdbd1cdb6b1b4aee5e
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:31:25.216Z'
    finished_at: '2026-08-23T12:31:40.474Z'
    artifact_digest: 4c1a0b82ec957149e2f8734510d914e78d817d2cee7136fb4eb816032cb16f3a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15258
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e6f9c2adc03a45885fe403ae
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:32:38.656Z'
    finished_at: '2026-08-23T12:32:54.734Z'
    artifact_digest: 38ae1700eb9aa9dfd2e4e7187d7380fa39a2d9dbdde439e76d13a20449e0bc03
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16078
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3293e4e68d5b495d29a141a2
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:31:41.179Z'
    finished_at: '2026-08-23T19:31:57.175Z'
    artifact_digest: 2b2e45a54284d2f928fa5b8eaacbcd1ea26623d6f0e2a88cf0a61581753a3ee5
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15996
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d121c306805dfa5a33c2d456
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:32:53.479Z'
    finished_at: '2026-08-23T19:33:09.207Z'
    artifact_digest: c2feff78d184f7e529baaef288a5b3e4ebf4dccfa1e1c04348ead5eb2b97430a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15728
  - version: kibi.verification-receipt.v2
    receipt_id: VR-60c07438764483989bb59436
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:57:54.003Z'
    finished_at: '2026-08-23T19:58:10.102Z'
    artifact_digest: b2281059e878a56442492f4971736d3ed02026b430d42a4f35bdb28778621b92
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16099
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ae31c2f7467135dfa92217b2
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:59:05.911Z'
    finished_at: '2026-08-23T19:59:21.244Z'
    artifact_digest: bd6398c36dc3aa3c14f12b324815d786b7c4e965966756992e82d1044d0fa984
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15333
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7e1ffe63795319c9db145821
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:25:19.400Z'
    finished_at: '2026-08-23T20:25:35.019Z'
    artifact_digest: 8f52c2853a63b3ad55eeb587d6a829d1e6eca8978b26f56d02bb8327bd97ffd9
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15619
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8afbfeb92a0e4b02ae793684
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:26:30.906Z'
    finished_at: '2026-08-23T20:26:46.198Z'
    artifact_digest: 18a9bcb83f1cb119339bf905594e84c0a0e43d876ee219aae57d3e92c86148df
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15292
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e3189c849018218689b5a263
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:51:24.227Z'
    finished_at: '2026-08-23T20:51:39.243Z'
    artifact_digest: 83180dcdd7fb1ec8f7b96f3b8a9198f28c90a7fd691f4a34ecd4c8df821fe676
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15016
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e6ed45ef420ac6f9022923b9
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:52:33.124Z'
    finished_at: '2026-08-23T20:52:48.108Z'
    artifact_digest: 7119571ae483b793f6f8a94170bc5ca19e968f628dcb40cfbebbae6f6e125ed7
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14984
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0c0042c29ea2e0dc38e0cc56
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:31:50.286Z'
    finished_at: '2026-08-23T22:32:04.894Z'
    artifact_digest: bad7baec39c78af57b36ddde8a5fe185254f4751821ff745e9fdaac3f1e927c7
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14608
  - version: kibi.verification-receipt.v2
    receipt_id: VR-36f18f7c779b8785e9729b5c
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:32:57.751Z'
    finished_at: '2026-08-23T22:33:12.661Z'
    artifact_digest: a9b55a8021104ac3b7a3e104c6d8937487768d254eb7ae094bdca542201024b1
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14910
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6ef3f21ced71a1e5deb7ef01
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:58:10.520Z'
    finished_at: '2026-08-23T22:58:25.688Z'
    artifact_digest: f574b9b5c592a6f46b9c568086ea92c6d005cb714c927955ac02f7cbcf5e5dfc
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15168
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7fd8efb03c9d82325e1b604b
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:59:19.199Z'
    finished_at: '2026-08-23T22:59:34.180Z'
    artifact_digest: d055345688e5b9ed95c5a5bb23662751353c864fc46b71baae39472927ae61ed
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14981
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6e60e2875ac421f6ad3e6ab5
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:46:31.258Z'
    finished_at: '2026-08-24T06:46:54.432Z'
    artifact_digest: 6f1ccac22d45b3f19d518a514f291459cfe844fe82c79739dfb9de6f099aa26d
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23174
  - version: kibi.verification-receipt.v2
    receipt_id: VR-caa756dc5dde03e95ce36dea
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:48:03.400Z'
    finished_at: '2026-08-24T06:48:21.949Z'
    artifact_digest: c6482b76afb8ec8958c9693e6e484fecebafe18ef5127800574eefbedc36b579
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 18549
  - version: kibi.verification-receipt.v2
    receipt_id: VR-00981dcd8932a680a8759e34
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:13:33.840Z'
    finished_at: '2026-08-24T07:13:49.870Z'
    artifact_digest: a74c2b97f1a1c3c62ccd5854fb439dcbe1415fe87c57445acd97b87500a12055
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16030
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb10a4afab946ad38b2c4800
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:14:47.495Z'
    finished_at: '2026-08-24T07:15:03.205Z'
    artifact_digest: 5b6c9728c87a2acfc7b058a5b4782e0e8e94085e79a4b176eeeca7621fea66ca
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15710
  - version: kibi.verification-receipt.v2
    receipt_id: VR-75b6e94c4b662e4a064937dc
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:09:58.104Z'
    finished_at: '2026-08-24T08:10:16.718Z'
    artifact_digest: 4549d3a8b804d98320ccddf37a90a69a937368a8002f599816b9ce9d82f5a75b
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 18614
  - version: kibi.verification-receipt.v2
    receipt_id: VR-62dafb2fb0ea39897ec287c4
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:11:30.028Z'
    finished_at: '2026-08-24T08:11:51.609Z'
    artifact_digest: 33a798f5bd66039554eb758bad88c90fd3432f2c584e1e5a8887937d1ac9634d
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21581
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d97ca4c4a3fadc796788ede5
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:41:58.001Z'
    finished_at: '2026-08-24T08:42:14.851Z'
    artifact_digest: 1bbdc2aaaeab4d6f1e1701bf49ce632be9d697de7629216bb4787d41e7f3405a
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16850
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5e0a6b306bd9400bdd94fc7a
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:43:21.447Z'
    finished_at: '2026-08-24T08:43:38.994Z'
    artifact_digest: 5f27972073a1e042179d2426ee30c2720a1338acc24b7358ab237e7e8cb9cd74
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17547
  - version: kibi.verification-receipt.v2
    receipt_id: VR-53699468ce1c88ccea76d6e2
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:12:02.170Z'
    finished_at: '2026-08-24T09:12:18.731Z'
    artifact_digest: 1afe0e163884253d938b31b399b3d0d7ae076528a39a086b6bc907dfe1816bf9
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16561
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f62f81db9106a50ffe3018d7
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:13:23.825Z'
    finished_at: '2026-08-24T09:13:43.344Z'
    artifact_digest: 969d5a7ab69e4e2f3cbf9334335fccdf11d8fbe6b9d73c22eca0cb898884e97e
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19519
  - version: kibi.verification-receipt.v2
    receipt_id: VR-847ff551dd9243d5ea4e63b2
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:23:30.457Z'
    finished_at: '2026-08-25T21:23:45.972Z'
    artifact_digest: c1877ab0cae8db30b2284318c62629f0ab0b20afadfcb1a4dcdba418347fb117
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15515
  - version: kibi.verification-receipt.v2
    receipt_id: VR-142c593e5c4c0f61aa856988
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:24:41.657Z'
    finished_at: '2026-08-25T21:24:57.235Z'
    artifact_digest: 9aed8622b1753a4e2a940576b44a845afc78a0750891d0396940ec684de6552d
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15578
  - version: kibi.verification-receipt.v2
    receipt_id: VR-73b95f78751861cd62fe75c0
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:12:29.060Z'
    finished_at: '2026-08-25T22:13:39.972Z'
    artifact_digest: 70b3e8f0e50e8b0d3b04a7b4a0d8dd5fd183e5ee66677db3c2b5e65becf506b4
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70912
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7e8e68559183f49419b3cc1d
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
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:15:48.925Z'
    finished_at: '2026-08-26T14:16:58.930Z'
    artifact_digest: 46ea9653d4ac6314897e58c118439f48f04de4a8711f0a9eadc2fc3b00eb25b2
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70005
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b68f74b32c55ce71e5cacb03
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
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:29:16.399Z'
    finished_at: '2026-08-28T10:30:26.574Z'
    artifact_digest: 145058044c9b0c281c8f382f762b3bd0f25a62884613837da7d5131e7a2f0154
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70175
  - version: kibi.verification-receipt.v2
    receipt_id: VR-da24c84ea9df27029859452d
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
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:36:11.018Z'
    finished_at: '2026-08-28T13:37:18.454Z'
    artifact_digest: 54d58561241e5fa2674884b01c28b69e44e17431ceacc5528eebee17ee464eaf
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67436
  - version: kibi.verification-receipt.v2
    receipt_id: VR-89da58c2cbd2c390436d9767
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
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:20:02.471Z'
    finished_at: '2026-08-29T01:21:10.166Z'
    artifact_digest: 076f9b0aeca2c5d3a7117daa57a7a9e9ab0f7231188a8097413d7e9707b5083e
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67695
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7e91a684a6c0719d7c8b3462
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:30:33.131Z'
    finished_at: '2026-08-29T07:31:14.216Z'
    artifact_digest: 8f34f6c20baff9ca6c6d3681c33f5b6dec19484419f5f28984cd3c11f33a0297
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41085
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ddb54934b44f5ba8706b21ab
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
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:09:21.883Z'
    finished_at: '2026-08-29T08:10:07.575Z'
    artifact_digest: 4a19f9e195cedbd3c689e2366c06153c1b97ffdb9da2ff899d6651a290f55cce
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45692
  - version: kibi.verification-receipt.v2
    receipt_id: VR-76148224d1252f5835fb081d
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
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:40:57.449Z'
    finished_at: '2026-08-29T08:41:37.860Z'
    artifact_digest: fcb965634344cc7831746996760fb8ea88598b076c2130ae31b5fe0f52b3ded2
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40411
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1650b3251785d1e83b1811f3
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
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:30:08.044Z'
    finished_at: '2026-08-29T09:30:50.791Z'
    artifact_digest: bf6628b4bef3a6855e30c2bbbaebaec7ca7d1ad8bd02a08d109c6c56d6a0360d
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42747
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ea33b41071211dc2eb2ba615
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
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:00:19.149Z'
    finished_at: '2026-08-29T10:00:59.546Z'
    artifact_digest: 2cb008bbac7560d31a23d2e8e99b667d9142124c6485be0689106760dffe853d
    contract_hash: f33ef1a4ef5bbfd7e106c5190bce217fd74cc7498fa7a8f03af406c17ff8f843
    case_results:
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40397
---
