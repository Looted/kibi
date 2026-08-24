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
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
