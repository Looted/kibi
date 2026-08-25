---
id: TEST-kibi-intent-aware-source-discovery
title: Intent-aware source discovery verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-intent-aware-source-discovery.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - search
  - intent
  - source
  - test
links:
  - type: validates
    target: SCEN-kibi-intent-aware-source-discovery
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-intent-aware-source-discovery
  required_case_symbols:
    - SYM-test-kibi-intent-aware-source-discovery
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1590a04fbb5bbe3cc92dcf93
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:45:47.828Z'
    finished_at: '2026-08-16T19:46:32.936Z'
    artifact_digest: 031dac062f8a0c55e19142a07579dc00037c4f8c03c4910bd77fcfffe7deb7e6
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45108
  - version: kibi.verification-receipt.v2
    receipt_id: VR-968f9483dbf75b8c3219ca7b
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:08:20.253Z'
    finished_at: '2026-08-16T22:09:15.957Z'
    artifact_digest: 031012c2b539c15c2d44259c0d6949a3b1e6eaff8c456fd4ced285c49733a279
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 55704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7f48d5e3888993a72d9cfad4
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:28:14.467Z'
    finished_at: '2026-08-17T12:28:57.798Z'
    artifact_digest: a81d92ee1472d1785b68acc5c12bc8e9959ffb2e64c2c60f66ea96267ee2fe6d
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43331
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc44fa07c3c3553cd83603cf
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:21:00.282Z'
    finished_at: '2026-08-17T21:21:46.046Z'
    artifact_digest: a3884c68eb1b1212aaaeb381e3ff83202e67527183f8f87cdbf3b7e083820796
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45764
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1ef1721b5452d6c7da45f36e
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:36:42.536Z'
    finished_at: '2026-08-18T07:37:31.540Z'
    artifact_digest: c0ada6e6bf7bbc1cdb7b1803be4740fd31f1932ebc46e45a499df1697e195709
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49004
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8a7a4c3f52eaeba2072ac160
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T11:02:54.100Z'
    finished_at: '2026-08-18T11:03:42.223Z'
    artifact_digest: b7782c4639cffd03d17178af86ac607812ef8f9aabde4d1addd4c778d7eea297
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48123
  - version: kibi.verification-receipt.v2
    receipt_id: VR-835d654176eefee9e273e0da
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:29:10.692Z'
    finished_at: '2026-08-21T23:29:37.658Z'
    artifact_digest: 2c4ed85f13651f3512683d977821ec703144f8961d3eebe1483fd5f1c5647d6f
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 26966
  - version: kibi.verification-receipt.v2
    receipt_id: VR-61b22b03bebe506de56792f2
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:04:21.823Z'
    finished_at: '2026-08-22T07:04:44.553Z'
    artifact_digest: bb71a632655cb70f821451010ae0be5ba9a6b8d1d7f0e4d1cf6ebc83e4c4db23
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22730
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ef911307fa3ae4cb5ae9e1b8
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:23:59.260Z'
    finished_at: '2026-08-22T09:24:18.410Z'
    artifact_digest: 5e3dfc4d5aa7bd18f19f5471a38ced909101b573def7e5f2bd1349f9ed6de771
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19150
  - version: kibi.verification-receipt.v2
    receipt_id: VR-75def00887456fc6d55c8793
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:07:49.832Z'
    finished_at: '2026-08-22T10:08:06.176Z'
    artifact_digest: ff334247216970c65c459a4001a7d2ce5dc0ba60dfa8ad17e91f59b8138f5b75
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16344
  - version: kibi.verification-receipt.v2
    receipt_id: VR-26939d5f48b6fc3537c211c2
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:01:22.578Z'
    finished_at: '2026-08-22T13:01:37.758Z'
    artifact_digest: 5f93991adfa1e14681374f9eeea3584d0c7f37c234cc313fccea1fc28d42b2e6
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15180
  - version: kibi.verification-receipt.v2
    receipt_id: VR-292996a8705bd2bb736ea649
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:45:27.351Z'
    finished_at: '2026-08-22T21:45:41.824Z'
    artifact_digest: 6efe60af8efe51d434dd6d2eb8fb401227b07da8aae89ce4b628984295284e0c
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14473
  - version: kibi.verification-receipt.v2
    receipt_id: VR-adeae0e3c085e13bf8ccdb72
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:50:58.251Z'
    finished_at: '2026-08-22T21:51:13.733Z'
    artifact_digest: c01bed181d8ec57b01ffa91506d07069bc39066cd6b5653f6147e88781dbbdd2
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15482
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f0af814f1edab7602c7e1159
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:19:46.134Z'
    finished_at: '2026-08-22T22:20:01.608Z'
    artifact_digest: 389e028d4a245d9e6cc8ab64a1cf974d531e31584125ec6df4de858eb0e58397
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15474
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c46b506f3de27a7ddaf7fd62
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:50:47.615Z'
    finished_at: '2026-08-23T07:51:03.892Z'
    artifact_digest: a8fa6863f64240d7dc318e3c16fc9a3672cdc7da05a537fe0b3c600c73634a26
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16277
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cad94a3318ff43f8df2b5112
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:33:57.120Z'
    finished_at: '2026-08-23T08:34:13.322Z'
    artifact_digest: 8d7c7d961bf1c763fff69d012c01dfc67d8dd22d09a35ba55fba9f091a633372
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16202
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dbc099b015cebe97a85dd19c
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:30:33.827Z'
    finished_at: '2026-08-23T12:30:49.368Z'
    artifact_digest: 31d0d4d2b249e566ef0d876332cb692c572577c984291da743c2285150335427
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15541
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9a2b11ceb4d366271a8a5691
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:30:51.011Z'
    finished_at: '2026-08-23T19:31:06.773Z'
    artifact_digest: e7237ed7f2cb0333ae1da4b0a805a39ddc75a18fc863245c0851c1c1fa8ed58c
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15762
  - version: kibi.verification-receipt.v2
    receipt_id: VR-493db7f10523109bb19606f8
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:57:03.787Z'
    finished_at: '2026-08-23T19:57:19.027Z'
    artifact_digest: 14e1187c27a95d85b83cd54d3c922a4048872f581a50f6f4177dd319df1b56cd
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15240
  - version: kibi.verification-receipt.v2
    receipt_id: VR-267af7f840e947334f5fba4d
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:24:31.062Z'
    finished_at: '2026-08-23T20:24:46.340Z'
    artifact_digest: b64be543bd638cb440bd85f630729b377fda819689e836ec5f5d4a775411e63a
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15278
  - version: kibi.verification-receipt.v2
    receipt_id: VR-61ff6273e3db6afbe87b02f4
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:50:38.048Z'
    finished_at: '2026-08-23T20:50:52.828Z'
    artifact_digest: be82cf203b7956fbb07567128175abac9e0481be2211fb0735e84034ebde063b
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14780
  - version: kibi.verification-receipt.v2
    receipt_id: VR-786b6f54e8026d7c178deb12
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:31:03.917Z'
    finished_at: '2026-08-23T22:31:18.520Z'
    artifact_digest: c31eead9af1b4e217c30ed7d72885ad323c29679f625388c6b3a898d95e060e3
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14603
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e70f3b3e008896197c7bf93f
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:57:23.822Z'
    finished_at: '2026-08-23T22:57:38.396Z'
    artifact_digest: 56fcb3ab9c8f1e901f03c38132b0bf7f332b9311a66ad7004503eefc0a0a4892
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14574
  - version: kibi.verification-receipt.v2
    receipt_id: VR-05d7320f803ef5d25fe73445
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:45:27.307Z'
    finished_at: '2026-08-24T06:45:43.598Z'
    artifact_digest: 31a86025521d811e1dda513adaedbbfdd6202e5101b44cdd040a539fdbf07636
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16291
  - version: kibi.verification-receipt.v2
    receipt_id: VR-04d59432a5d267f959fa099b
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:12:40.488Z'
    finished_at: '2026-08-24T07:12:56.566Z'
    artifact_digest: 9b88dbb956f1d1dc0d4fc926af2569a5f41cb223f90217c90fe7f9d91aa64e3e
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16078
  - version: kibi.verification-receipt.v2
    receipt_id: VR-05f3c6d392ed02eaaa41c214
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:08:36.874Z'
    finished_at: '2026-08-24T08:08:54.375Z'
    artifact_digest: 72370a53a4fd885d909dd3a16c4ed4ca82a484d4b310f31b93a5770de21157eb
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17501
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2602925db794822165d587b8
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:41:03.324Z'
    finished_at: '2026-08-24T08:41:19.551Z'
    artifact_digest: 12d04cee193435915df55803e878b32957fda1789982bafe444817e48e81dbb0
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16227
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d664235ebb66f71b9682fe73
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:11:06.771Z'
    finished_at: '2026-08-24T09:11:24.517Z'
    artifact_digest: 9a8be2466f1d01b61746770eeb52c08089c753b5ebdebc72fa6921c5b655d604
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17746
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ced75977f78d84a5cf4bd5c7
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:22:42.911Z'
    finished_at: '2026-08-25T21:22:57.567Z'
    artifact_digest: a35af5cc7317678d8e7c5e6a41f3678ca18a3400ea7aa9868532b84057710528
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14656
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6d48f1646a32dff678184abe
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:07:58.561Z'
    finished_at: '2026-08-25T22:09:06.843Z'
    artifact_digest: a3169fee788bb41d84e5337ff391648b65c44cc9da62daef0b97112672200124
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 68282
---

The CLI and MCP search contracts accept natural-language intent, return stable ranked entities, include source-linked evidence and graph paths, and preserve explicit zero-result behavior. Unit and operation parity tests cover lexical fallback, source filters, relationship filters, and deterministic ordering.
