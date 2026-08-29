---
id: TEST-core-journaled-engine-lifecycle
title: Engine daemon serialization, recovery, and protocol fencing
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - engine
  - lifecycle
links:
  - type: validates
    target: SCEN-core-journaled-engine-lifecycle
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
    - TEST-core-journaled-engine-lifecycle
  required_case_symbols:
    - SYM-test-core-journaled-engine-lifecycle
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fdd5aff7bf507d55706152f3
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:47:24.473Z'
    finished_at: '2026-08-16T19:47:32.140Z'
    artifact_digest: 6a57b7cd50e9a19113de56e468a648a99a82cb641a1192113e336975a9b6d71f
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7667
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a935912629928d2642005a8c
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:05:00.079Z'
    finished_at: '2026-08-16T22:05:08.436Z'
    artifact_digest: e8cf7f5003b7827748433bf4a5ba0ee3dd2a072dbd38edf949bb065b33e9882f
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8357
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0d169d3e06fa9b759aed6a96
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:25:26.705Z'
    finished_at: '2026-08-17T12:25:34.573Z'
    artifact_digest: 1a78678fc9f32733ebe2cf597f10bdb09bb9ddafdc8f704c97e2ddddfffab968
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7868
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ca88ab77f3d19777205cd1f9
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:18:07.281Z'
    finished_at: '2026-08-17T21:18:15.193Z'
    artifact_digest: 942ad4abf01d49ca8f70a1731577fb815642efafb2f6ec7ed6ecff0b7f8fcbaf
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7912
  - version: kibi.verification-receipt.v2
    receipt_id: VR-268168778b6486f9a0b9b80e
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:33:39.599Z'
    finished_at: '2026-08-18T07:33:47.817Z'
    artifact_digest: 477a24ab38ef96d78155d71b5a2bc83fdf05ffbb3bdc5aebc016d3c326e230ab
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8218
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cedfd622639f627f8e83f274
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:33:27.679Z'
    finished_at: '2026-08-18T10:33:35.755Z'
    artifact_digest: 9809f83e696df048fdc9c9c13972700363b8327bce4c1fec37e71766adb317ec
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8076
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c8c9b7b9de228d7ded0d361e
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:56:05.688Z'
    finished_at: '2026-08-21T22:56:14.982Z'
    artifact_digest: 69c14330ee50720ddfccf9582cab29b2f39b7e0c3694c83f9c214ae9d26a75d6
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9294
  - version: kibi.verification-receipt.v2
    receipt_id: VR-858482acf0e249e316c34855
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:21:55.600Z'
    finished_at: '2026-08-22T01:22:06.533Z'
    artifact_digest: d13ab2ab77895d05c98576fd967efdce9fe28d8a395d159010983126c1359c28
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10933
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ce1ef81feea2961a51d2a45
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:23:44.962Z'
    finished_at: '2026-08-22T08:23:55.706Z'
    artifact_digest: b914b799bc1160ed0f158a326f5edecd276bee504d76b5e616d400f933ed4aea
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10744
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b938cd45fa847040ea2b15f5
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:04:54.117Z'
    finished_at: '2026-08-22T10:05:02.694Z'
    artifact_digest: 21ef1d478275ee5abd96eb8a9662ef0f9586972b6e8290de4e9e375737354dbd
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8577
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cb9e9bedbcb22d06b7d6cea6
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:58:46.894Z'
    finished_at: '2026-08-22T12:58:55.051Z'
    artifact_digest: 055016235a04030a2651d9a1fd9a7daa34b02a73b7e1ea4173c3e08fc9dc7524
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8157
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6b7749de10b713bfb6ce4303
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:42:50.271Z'
    finished_at: '2026-08-22T21:42:57.207Z'
    artifact_digest: 6b28b3a88836026a69c7c2442090642fb3aef4e030d2f4917c161b7424152cbd
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6936
  - version: kibi.verification-receipt.v2
    receipt_id: VR-75f42c6ed2299c28fe43ec85
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:48:25.031Z'
    finished_at: '2026-08-22T21:48:33.457Z'
    artifact_digest: d64db67ae15159c62896fa4f4053c19acab4d3f0a3d4f98e072fb4afd149fcf0
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8426
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6b9d137079304ab45716bbb5
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:17:12.970Z'
    finished_at: '2026-08-22T22:17:19.849Z'
    artifact_digest: de630a902ef929284e88dd716ebcde69f7dac97ee007f79c20d2652f9d2e8bd0
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6879
  - version: kibi.verification-receipt.v2
    receipt_id: VR-555bb1b44f0f1e817c145658
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:47:47.053Z'
    finished_at: '2026-08-23T07:47:55.493Z'
    artifact_digest: 1cd8228293a7fd68db65f93448b7081f91dda288b51a8b985a40e64ea57b2c41
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8440
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c969ccb0fa2085d00aa14a68
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:31:19.338Z'
    finished_at: '2026-08-23T08:31:27.569Z'
    artifact_digest: a5db7ba28b963357e377ab892b895c63ff8b75e5cb0a36efe4388a717cae4478
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8231
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d14cb7ab8bdb89ce6231a5a1
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:27:57.754Z'
    finished_at: '2026-08-23T12:28:06.024Z'
    artifact_digest: 1a97beb4ca2bdc36f1c1372f71080fbd956f3a812003428533c1382c65d2d9ee
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8270
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d17261bf20d0f38f9777a1f8
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:28:09.756Z'
    finished_at: '2026-08-23T19:28:17.973Z'
    artifact_digest: 7c70a3868f5a5a281c476476549f5b72ed1fce2f59eca5c6a86f043d0becea5d
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8217
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e9ed76ce018816647ce96d05
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:54:26.958Z'
    finished_at: '2026-08-23T19:54:35.125Z'
    artifact_digest: 7e402dac04402b00e7f84e03a8b6e2d965da5af492ef4ba6d0cd29e8ab36ef37
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8167
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed57403979d34f95a675ca1c
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:21:57.492Z'
    finished_at: '2026-08-23T20:22:05.715Z'
    artifact_digest: dafa53c0af24324465cbfab49e2fbdb4991aa6e2bcc05564b79aade7f8fab0d0
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8223
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0a3e46bc6e3881a709ab9bd0
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:48:08.148Z'
    finished_at: '2026-08-23T20:48:16.242Z'
    artifact_digest: fab6d59863dd45318ec55eacf5a6ba1d135a5e9484fc78e2aa354720f7ebb63b
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8094
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f45526961ae24b38a3f1751d
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:28:34.112Z'
    finished_at: '2026-08-23T22:28:42.207Z'
    artifact_digest: bcc1bd7699aa92d81409a9e8358fa6a3de2556f643c25e63e7e7968fd9a597ec
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8095
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4fb14ce3a066524aff01b853
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:54:52.530Z'
    finished_at: '2026-08-23T22:55:00.603Z'
    artifact_digest: e134c9ff68b15811c5fc9aff209009dd72183981c35fa0218eeeddfeadfdaaf2
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8073
  - version: kibi.verification-receipt.v2
    receipt_id: VR-efd1d76912bbfd9c663af821
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:42:25.211Z'
    finished_at: '2026-08-24T06:42:33.821Z'
    artifact_digest: 52371b4ce35ba0a43e9f464d51e1e738fe1bc5fdbf58bd58013f6651698364fb
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8610
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0c3421745e83f2ab5fe507e8
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:09:56.572Z'
    finished_at: '2026-08-24T07:10:04.858Z'
    artifact_digest: 299187a3671e5004b809f5692e84297a7d536ea380dd97f67efe85ba527861c7
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8286
  - version: kibi.verification-receipt.v2
    receipt_id: VR-12be2fa90aa490f24bb9b673
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:40:13.195Z'
    finished_at: '2026-08-24T07:40:23.044Z'
    artifact_digest: 219c19a5768e81f2ec0ac54c0eb8d31eec1753045c90f274d9ba8316d3b65b98
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9849
  - version: kibi.verification-receipt.v2
    receipt_id: VR-53b55f796c9a903d424a63d7
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:05:26.614Z'
    finished_at: '2026-08-24T08:05:35.359Z'
    artifact_digest: ef5181cfc0ff7d11edb17751f28927468a410b10384a72d0015616ee8d58b760
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8745
  - version: kibi.verification-receipt.v2
    receipt_id: VR-223fe8fdd19b06fea5ce0c07
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:38:01.467Z'
    finished_at: '2026-08-24T08:38:11.110Z'
    artifact_digest: 64610fc95f6926aa0323f1e2d800fc95c9d801c747886387eb4d5e8e0f395518
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9643
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e7f4f9a715e27f33cf70e668
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:08:04.659Z'
    finished_at: '2026-08-24T09:08:13.468Z'
    artifact_digest: 5bce656279c1ffb72d568ee171af0ca3a0caf67c31a5f929eaa64b39e0ca8529
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8809
  - version: kibi.verification-receipt.v2
    receipt_id: VR-78f6413b3f6529be79c813af
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:20:06.869Z'
    finished_at: '2026-08-25T21:20:15.129Z'
    artifact_digest: 263152088b3f167a393c774747acc7015d85fb76129edbf2f6f4ccbc4c62daea
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8260
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c723e915833e63052f5eb0fa
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:04:29.959Z'
    finished_at: '2026-08-25T22:04:38.065Z'
    artifact_digest: 8eca59d717059e0f401c4783f51449f30869e6eda3fc3042b0f0984baad2516f
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8106
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6f0d945d1684078f8c125913
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:07:46.468Z'
    finished_at: '2026-08-26T14:07:54.653Z'
    artifact_digest: 7cb29ba1a735f229fb0b57888f7cf2d6a85128c694fd285a6d53670cd2a900e9
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8185
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c722c909ec6e73cee89379e8
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:00:33.257Z'
    finished_at: '2026-08-26T16:00:41.431Z'
    artifact_digest: 57dc0b620630416302948bb0a348bbeb8ae9eba2477958eb26b3ae7dde5960db
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8174
  - version: kibi.verification-receipt.v2
    receipt_id: VR-575b77a4bcc3e4f1e5da8823
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:01:56.968Z'
    finished_at: '2026-08-26T17:02:05.383Z'
    artifact_digest: ac4601092b1b63f136ed89a1a9e2a999c0e1e0f46b2c18a4239b9b822430dcce
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8415
  - version: kibi.verification-receipt.v2
    receipt_id: VR-acb1cadc3414b2a3758b231e
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T12:58:02.489Z'
    finished_at: '2026-08-28T12:58:09.071Z'
    artifact_digest: a24e4e9787f62e0ecaa29a7c50df0b6503a558a9f241ad4c6b00db47bbaf7e01
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6582
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a686abad20aa98719bffdffc
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:47:04.290Z'
    finished_at: '2026-08-28T13:47:12.223Z'
    artifact_digest: 9afff08c9201e1c548824bd8a5f6946a64674210bf4a94e0cf1b0d017b2806a9
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7933
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2788cc4da915de0f7a8e9558
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:30:54.248Z'
    finished_at: '2026-08-29T01:31:02.090Z'
    artifact_digest: 12e59b649136f8d03c1094c56766f7be52df29b5098e68145cad8bcc613aca25
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7842
  - version: kibi.verification-receipt.v2
    receipt_id: VR-aa066fdb6e3d1f08c06b3b38
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:46:30.486Z'
    finished_at: '2026-08-29T07:46:38.677Z'
    artifact_digest: 5cfc712f45032a2c01eca1ae930996be796d50f9ef167545d2a3dc79d78492fd
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8191
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6752aebee8705baca0c4511c
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:16:20.140Z'
    finished_at: '2026-08-29T08:16:26.818Z'
    artifact_digest: 5fa46d8633d5ba3c4ef0acaa9f9398a5cb7c5087bb659bb4725c93c03be22ae0
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6678
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3acafffbb7e807c4bbcff6d9
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:47:47.888Z'
    finished_at: '2026-08-29T08:47:54.631Z'
    artifact_digest: ade958846be4b3172aba27483c5eebaa6bab5b3097d335fec388c01f22e17661
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6743
---

The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
