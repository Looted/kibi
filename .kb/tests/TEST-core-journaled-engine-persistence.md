---
id: TEST-core-journaled-engine-persistence
title: Journal replay, rollback, migration, audit atomicity, and compaction
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - core
  - persistence
  - migration
links:
  - type: validates
    target: SCEN-core-journaled-engine-migration
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
    - TEST-core-journaled-engine-persistence
  required_case_symbols:
    - SYM-test-core-journaled-engine-persistence
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a2a22d4864cc3615bc5ee034
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:46:55.658Z'
    finished_at: '2026-08-16T19:47:03.323Z'
    artifact_digest: 2c90c9c19ef988a9d0ea8928a9d128f95125c35aededdded34a8a9de4cf3ab59
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7665
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b2b27f7e8d7ed718a8175353
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:04:44.903Z'
    finished_at: '2026-08-16T22:04:53.308Z'
    artifact_digest: 96fa211363690a36f6ac749e444323774e8d1cba0699700b88e48aa07820b50e
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8405
  - version: kibi.verification-receipt.v2
    receipt_id: VR-01603283404c9646a981c96e
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:25:14.407Z'
    finished_at: '2026-08-17T12:25:22.308Z'
    artifact_digest: 7c6d26522aef4a77f2b65ead911d41e3d8397825cff4b6b8e8dc4589b100a574
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7901
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ee394d04c10bc2adf6aa922d
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:17:54.633Z'
    finished_at: '2026-08-17T21:18:02.571Z'
    artifact_digest: ccf456615939cdeb463e93b4598f8cc618bdb29e9f7a6f743935fa2f81867298
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7938
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a0b39f5c071aaaa4b24aa8ef
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:33:26.209Z'
    finished_at: '2026-08-18T07:33:34.317Z'
    artifact_digest: 82a97b203c3de43446ac3441fc5bf73bdbf0bc2e4119024162f3b1b5cd918fca
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8108
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ce6d5414412f334ba3c77e53
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:33:14.537Z'
    finished_at: '2026-08-18T10:33:22.796Z'
    artifact_digest: 781aa56618561f76e362db76c0d6796853817ad317c01e56126c926616d2209b
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8259
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7aee89b47edb178542d48ae2
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:55:48.052Z'
    finished_at: '2026-08-21T22:55:57.343Z'
    artifact_digest: 050353567462924d9cd8a65b9750950be3ad15eaeb38e091c096c1d6b2f32ead
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9291
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b676c939418d72103244d6f8
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:21:34.957Z'
    finished_at: '2026-08-22T01:21:45.562Z'
    artifact_digest: 5d54833ce2811ad0655e00b48c8b883bdb7cf8bf4ee0ff552522bc58fb6baada
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10605
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4321cabe269b7e0369d16da2
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:23:24.682Z'
    finished_at: '2026-08-22T08:23:36.039Z'
    artifact_digest: 34ff9d6fb387c5a964d750f266c2d0f3ad31f1de6d9e7b53ad4bbed8179ced6b
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11357
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1cf8d49b7f02f06772056fc3
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:04:38.652Z'
    finished_at: '2026-08-22T10:04:47.411Z'
    artifact_digest: 35896501c71dca4ebf91ab6e89177652d1bfed41a5df08bbbe4d8d2dce85b289
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8759
  - version: kibi.verification-receipt.v2
    receipt_id: VR-61c98d4b253ce947953f40e9
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:58:33.290Z'
    finished_at: '2026-08-22T12:58:41.459Z'
    artifact_digest: e61b954453b95e5f37efc324aa1ddfd82af7a11de410d07523c620cbeee0a4a1
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8169
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e3168f3f5e3d0574d13ab0a0
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:42:35.548Z'
    finished_at: '2026-08-22T21:42:44.105Z'
    artifact_digest: 0ef24fe79a29b505fa1372c2b764c77ddcc19ae3cbd7711f61fe06da16650b14
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8557
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f78a8ac2cfb87b92efb41ace
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:48:10.449Z'
    finished_at: '2026-08-22T21:48:18.805Z'
    artifact_digest: 45c41fee1988357a21c71d01d42239d6fdc563b1d9c07be4b877ccfe007f6266
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8356
  - version: kibi.verification-receipt.v2
    receipt_id: VR-df9f513addd2b70756d65000
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:16:58.903Z'
    finished_at: '2026-08-22T22:17:07.143Z'
    artifact_digest: 8cd5d4a5c95bfe0b45a1dffade21fa1fe6a27a2f11c0b097943ca83585e6df8c
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8240
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9b019113ef9bd07325568b62
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:47:33.001Z'
    finished_at: '2026-08-23T07:47:41.159Z'
    artifact_digest: 31ead2753eac8b8189c2fef83bcce63e3cdd07d7d2dda8699f883b9509ecb1a3
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8158
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7a4d742b47969e39d0ba56c2
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:31:05.171Z'
    finished_at: '2026-08-23T08:31:13.596Z'
    artifact_digest: 6a4b37f8cb2106002668952ca551aeb5282d5782348042bd6806176d55002008
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8425
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2eac96697208e1a41567e6e9
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:27:44.369Z'
    finished_at: '2026-08-23T12:27:52.443Z'
    artifact_digest: 4f003e4e2939ef22ea28e27e7725303e3b6448cbc739b4e8d1db502dc0c00a58
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8074
  - version: kibi.verification-receipt.v2
    receipt_id: VR-376ff4e9019749e8e0c2c018
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:27:56.048Z'
    finished_at: '2026-08-23T19:28:04.245Z'
    artifact_digest: dfa6b9a55b0b2d064bf2c7c281fdb9aa6c51e84c5093793c131c15ce8268db60
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8197
  - version: kibi.verification-receipt.v2
    receipt_id: VR-86bcea807f1dda8ce808c3ed
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:54:13.315Z'
    finished_at: '2026-08-23T19:54:21.550Z'
    artifact_digest: db653c25d51cc7d420d0294633340bbaf40deec0d2df9869c7ebad6ddc4c1a92
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8235
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6c4a10622b45fe0296a0cb74
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:21:43.518Z'
    finished_at: '2026-08-23T20:21:52.086Z'
    artifact_digest: 0997da9063f6cdf1f790d8dec64701a00be005a35dc1c4164c6e0425956d42a3
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8568
  - version: kibi.verification-receipt.v2
    receipt_id: VR-379a56372e992b1dd20cf777
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:47:54.812Z'
    finished_at: '2026-08-23T20:48:02.947Z'
    artifact_digest: b9be6fe0a2103246f437281d23fd1b90e2533b0ea96a33b07b5313c87dd28596
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8135
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a1296565b098048f9337cefe
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:28:20.935Z'
    finished_at: '2026-08-23T22:28:29.000Z'
    artifact_digest: 61ebd4045b976c2ff6c43b2d43cf73a2e503a9bc9e9def0bb205f3f8139be949
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8065
  - version: kibi.verification-receipt.v2
    receipt_id: VR-596ba3c921c229c202c47577
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:54:38.813Z'
    finished_at: '2026-08-23T22:54:47.024Z'
    artifact_digest: 15196fb1f55c6e14e30c5c574b70ed7c01cde082e9e94e85c664da835308c94e
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8211
---

The persistence suite attaches a journaled branch, verifies journal replay after
detach/reattach, proves a failed RDF transaction rolls back both entity and
audit resources, forces compaction, and checks that generation metadata and
audit exports remain consistent. Migration fixtures cover populated legacy
stores, corrupt input, digest/count mismatch, and repeated attempts.
