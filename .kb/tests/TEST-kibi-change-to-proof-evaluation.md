---
id: TEST-kibi-change-to-proof-evaluation
title: Change-to-proof evaluation harness
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-evaluation.md
priority: should
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - evaluation
  - search
  - planning
  - dogfood
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-evaluation
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-change-to-proof-evaluation
  required_case_symbols:
    - SYM-test-kibi-change-to-proof-evaluation
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb8ac7178c1409e6edb807f2
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:43:51.041Z'
    finished_at: '2026-08-16T19:43:51.072Z'
    artifact_digest: 7b9f7c86103c2db2e68ffd31b8cb02c16347167b165ba9b48b846ef4a3c1cf98
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-24ce5a0e2b8ce8145a84e69c
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:06:42.272Z'
    finished_at: '2026-08-16T22:06:42.310Z'
    artifact_digest: db55b551a6ba7558c044afe8670ec5764f7052796db23185edfdde1b75c4bc51
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0ccb8e94cf2e58df2788b45f
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:26:52.707Z'
    finished_at: '2026-08-17T12:26:52.738Z'
    artifact_digest: 61f787596c06870ae3fb3ea2f3ec38c976c1c637e8f73fd3e19458c2310d1796
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-08222f11d76ffe358b50497a
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:19:34.759Z'
    finished_at: '2026-08-17T21:19:34.786Z'
    artifact_digest: da2b77c76a8b84a8f44cf3e00ed041371c3d552f5585cf289c6533489b54d732
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 27
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f22952e56401e1467336fb61
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:35:12.593Z'
    finished_at: '2026-08-18T07:35:12.626Z'
    artifact_digest: 7f764eb1e12b78d469249ad7a80cc09fc06f49a7a57848b05101489149614260
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-abe3745e552160b7cedd05ca
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T11:01:23.503Z'
    finished_at: '2026-08-18T11:01:23.535Z'
    artifact_digest: be41e295b5c4bf4c5322d516240bfed26716013627409a095cae518fafaaf203
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 32
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bc9a37129cce9cca89dedf70
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:58:04.639Z'
    finished_at: '2026-08-21T22:58:04.683Z'
    artifact_digest: 0ceda01d5b88b553343979dccbedd4c87c964f752001d076d259c5a7c67d13aa
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44
  - version: kibi.verification-receipt.v2
    receipt_id: VR-40f78480c4ee2aa196f41144
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:24:34.355Z'
    finished_at: '2026-08-22T01:24:34.401Z'
    artifact_digest: 924f01eea314102079eed34ae9f40afb40fa5c9587b1e45965171e2107a22817
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6b17ccf86574e6ce84b678aa
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:26:14.294Z'
    finished_at: '2026-08-22T08:26:14.337Z'
    artifact_digest: e91d55982a4decd8fe0b46459955b9cb61581926a46eca793d20d6c1f3ecb2c3
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43
  - version: kibi.verification-receipt.v2
    receipt_id: VR-784534ceb16663eb976d1b86
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:06:43.728Z'
    finished_at: '2026-08-22T10:06:43.762Z'
    artifact_digest: 455c06aa52dbf60fdb813036d6f4466f17d7d3b7f8aa555fadd338bcc0997f75
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ba6d7eb2273ad725fdc0b137
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:00:24.212Z'
    finished_at: '2026-08-22T13:00:24.243Z'
    artifact_digest: 8ba92c252f65a1ee11d87d5d121a2a06173846aac8b47e0af8a5c6d511dd756f
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-01ee902a4d96584486fbd9f5
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:44:28.047Z'
    finished_at: '2026-08-22T21:44:28.080Z'
    artifact_digest: 236b9e77300e15df4205ff3807d751ad1b22f221da3e1e1faf3686abdd540a05
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-391a579e9c9509b0ee96b836
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:50:00.828Z'
    finished_at: '2026-08-22T21:50:00.861Z'
    artifact_digest: 1026c2beb704748b791115b62f883ff47ebbe6489cd55953d71d0b4e210e8a7f
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dbd76482c45ab5e61f5ed7ed
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:18:48.453Z'
    finished_at: '2026-08-22T22:18:48.486Z'
    artifact_digest: 7504e13d339432a6c02efeec0925d9a15629ea8db147731e62e43c7083a1c184
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33
  - version: kibi.verification-receipt.v2
    receipt_id: VR-18f3e1a437ca5d0992b85e8c
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:49:32.672Z'
    finished_at: '2026-08-23T07:49:32.726Z'
    artifact_digest: 0a54820e8579ada98b3c747544197c45e82d98f870816f82c06b4beb899358f3
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 54
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e07d357f141244bc11b30848
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:32:56.921Z'
    finished_at: '2026-08-23T08:32:56.950Z'
    artifact_digest: 10728b45ec20d975b12f3d24440b9df2f691e1087d0e069c12f79226caff0694
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 29
  - version: kibi.verification-receipt.v2
    receipt_id: VR-18941b793ddfeaec5fc58812
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:29:34.973Z'
    finished_at: '2026-08-23T12:29:35.004Z'
    artifact_digest: 849b7349d3e1dc07caf25b8f8d5a5ddd4e3ae6a9546a7f255633d2b211f81cbc
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c1d1bacb82366722f3d6ac36
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:29:51.567Z'
    finished_at: '2026-08-23T19:29:51.599Z'
    artifact_digest: 4afcd40c0277e67d2eef59e986b2cef5feaa6e11004f1f1b88fefcb7cd6d8095
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 32
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9f783f957703257b876b2c32
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:56:04.513Z'
    finished_at: '2026-08-23T19:56:04.549Z'
    artifact_digest: 9b265303038dce5ab99c2155750dbca7cc9cc9df1a306788ed20b529871cb71f
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f0a9ee06d5b51b292ef55ba5
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:23:33.850Z'
    finished_at: '2026-08-23T20:23:33.880Z'
    artifact_digest: 5cf74e1f7979f66b1d6b78f599a9a064f6451f9a00a4fc724533f730780df7da
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 30
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d10689b6443e5576ff5d85cd
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:49:42.565Z'
    finished_at: '2026-08-23T20:49:42.594Z'
    artifact_digest: ca51d660ac25d5535773285be05174df85edfdf44f2992aaf9dc9ba46513803a
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 29
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d6d29fd211b7048c3271974a
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:30:08.867Z'
    finished_at: '2026-08-23T22:30:08.897Z'
    artifact_digest: f819ab04cab8e1d9e3fcb8c270289fd6be4544fe89a62717cf28a92600d005fd
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 30
  - version: kibi.verification-receipt.v2
    receipt_id: VR-50cfb238348466a9c4276cf5
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:56:27.782Z'
    finished_at: '2026-08-23T22:56:27.811Z'
    artifact_digest: 79bc3cf7d5ee8a5ac818cdb3e079a83d3224d621a4d57bf6aca27f09e6bf892d
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 29
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fc3e9a31f17e93b0e2f6e9fa
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:44:21.639Z'
    finished_at: '2026-08-24T06:44:21.674Z'
    artifact_digest: 24f96b6b79f6d254d281f055365dbb26b9a5f3764ab1cda38f3ba93126d7b3fc
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35
  - version: kibi.verification-receipt.v2
    receipt_id: VR-114ec0ffb9a5d185d4988836
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:11:38.453Z'
    finished_at: '2026-08-24T07:11:38.492Z'
    artifact_digest: d5b177551a9ca6e1b24d5b1fa797c638c7b21e0ca0bf09541dbe64abbbaf454a
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f9b3a7b3a6680888202b014f
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:42:07.941Z'
    finished_at: '2026-08-24T07:42:07.991Z'
    artifact_digest: fc85be2b5b7afbcc85585635c129decb6a7d6f273d1cd3361d4eece614ccf280
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 50
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3036c14e48cb8bbda198bbed
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:07:23.309Z'
    finished_at: '2026-08-24T08:07:23.369Z'
    artifact_digest: f47d6683b5eaf99da18d5319f850beae7cd3e9f9d863b8174c2545352d86b1f4
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 60
  - version: kibi.verification-receipt.v2
    receipt_id: VR-15c3526fdcea0f2b49d6f669
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:39:57.215Z'
    finished_at: '2026-08-24T08:39:57.247Z'
    artifact_digest: 398d7bb6d33c1af06f287c1183d71a1071e2e43dc85d3c660df695c9576fab9c
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 32
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9fe71b94020c9e068ce9f2ce
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:10:02.560Z'
    finished_at: '2026-08-24T09:10:02.607Z'
    artifact_digest: 317dd91b19e2307ba570033f33183629d046bb8260236ef727357b17f1318258
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1a8c5a4a04d644f1abb20a14
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:21:43.741Z'
    finished_at: '2026-08-25T21:21:43.772Z'
    artifact_digest: 9e1a5a25bd21f214bbc463a96347e9684d6a204e859dc147eee0a05ee896d3a5
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31
  - version: kibi.verification-receipt.v2
    receipt_id: VR-da5433ba4ba15f5c4c3cb8ad
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:06:05.147Z'
    finished_at: '2026-08-25T22:06:05.168Z'
    artifact_digest: d44bd7a09ff8f6f067d24300856526de44c2262410645fe44249231437762437
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21
  - version: kibi.verification-receipt.v2
    receipt_id: VR-323156e87085ac354f3ef9db
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:09:22.127Z'
    finished_at: '2026-08-26T14:09:22.152Z'
    artifact_digest: 3ec46d33013bc5ab7967c755baa5bb4f36111623c1b138eda82e615a38015bd9
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 25
  - version: kibi.verification-receipt.v2
    receipt_id: VR-701f5388d8ec10b78e9a132d
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:02:12.537Z'
    finished_at: '2026-08-26T16:02:12.558Z'
    artifact_digest: 45fd49547a04676ae0d7b746efbadea2fe51f6cd6af9438a9eb312f12389fef0
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0d730743538d132d71ac4c51
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:03:35.542Z'
    finished_at: '2026-08-26T17:03:35.565Z'
    artifact_digest: b8d08c81015524fafa1dcaf9041eae87124357b6cc4b2c8dcf455ac182e13503
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7e62d447793add86956ca261
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T12:57:31.654Z'
    finished_at: '2026-08-28T12:57:31.673Z'
    artifact_digest: db2d32e845aba67dc1c0e13f0e0ed0633c59420cecb9e419870f3d4c7b20ffae
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f2ae119b9e6a3c8d0caabe2e
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:46:44.267Z'
    finished_at: '2026-08-28T13:46:44.287Z'
    artifact_digest: 098602fc81ae1fd8f02243ec23b683c561c4220f42f6053a8e2598de07dc1028
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a856ad78b4c7da5f003516f9
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:30:25.430Z'
    finished_at: '2026-08-29T01:30:25.451Z'
    artifact_digest: 18173b28b895b1c416fc7939e0e996fcfa507797fd493a7f5b87a3404d1135c7
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c4873bf28f59eb8174fa908d
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:46:15.906Z'
    finished_at: '2026-08-29T07:46:15.918Z'
    artifact_digest: 621f79e5f5052a670384cbc1dd2385ac849ddb194acfd9dd912c5c6cdc832caf
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3764748d0d7daf41dba42997
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:16:05.732Z'
    finished_at: '2026-08-29T08:16:05.743Z'
    artifact_digest: 38764c5d52931b08b64a598a9ea5d2192bdadaad008019a4d16023373ce40a99
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b3a57aa841b200695434e0ce
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:47:26.250Z'
    finished_at: '2026-08-29T08:47:26.261Z'
    artifact_digest: 840e7605e3ba23e2d3e3f3878378ff44fa21e11ee579735fc98f83ccbb82a0f4
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ca08f26e5cebb9413b791381
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:36:28.328Z'
    finished_at: '2026-08-29T09:36:28.339Z'
    artifact_digest: f2d4e313f3f1ae2223b96a0a62af293cb40249f2e0f2df4143903504fefb266b
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8557c63bf6ccd8522b403e81
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:06:48.447Z'
    finished_at: '2026-08-29T10:06:48.459Z'
    artifact_digest: 00c374b04fae5e3ffae98cb8455eeab702a56050c54b056c11bb96a94e3b7dac
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0f1b77783f37d59da8024ce1
    test_id: TEST-kibi-change-to-proof-evaluation
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-evaluation
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-evaluation
    scope: end_to_end
    outcome: passed
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:46:43.329Z'
    finished_at: '2026-08-29T10:46:43.341Z'
    artifact_digest: 9bfa043d34a3d6e1f6c7831e141b254e105effcb404ec710bb612b18e1393fa8
    contract_hash: d3aa4958e77cc2c2df9a6ff5d1d32d1fd88de59cdd4a0f641e5a48f51b6cd8b0
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-evaluation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
