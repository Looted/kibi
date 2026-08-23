---
title: Reusable Consumer-Local Plugin Launcher End-to-End Contract
status: active
priority: must
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
tags:
  - kibi
  - test
  - e2e
  - launcher
  - consumer-local
  - ontology
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
  required_case_symbols:
    - SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
type: test
verification_receipts:
  - artifact_digest: 484835dea20b90d7b8ec394ac87f8072db4ce505d036e29b7b3f1d8a5e88b0da
    case_results:
      - duration_ms: 132120
        outcome: failed
        project: default
        retries: 0
        symbol_id: SYM-cursor-packed-launcher-e2e
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    contract_hash: 89ed27e809e289b3b340c752dda7b497006bad5ed35cec650681d479c2737a19
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    finished_at: '2026-08-21T08:13:52.808Z'
    outcome: failed
    receipt_id: VR-130105e269fde4003858a9af
    runner: node
    scope: end_to_end
    started_at: '2026-08-21T08:11:40.688Z'
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    version: kibi.verification-receipt.v2
  - artifact_digest: 211a682182b2a551021b4ad689f0bd4681490ebeed6b1a91f32252ec959a5adc
    case_results:
      - duration_ms: 110104
        outcome: failed
        project: default
        retries: 0
        symbol_id: SYM-cursor-packed-launcher-e2e
    code_snapshot: 8f81440c4148370ea92ac86c92621a66379a0902dc013befb9a9af69a883e19a
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    contract_hash: 89ed27e809e289b3b340c752dda7b497006bad5ed35cec650681d479c2737a19
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    finished_at: '2026-08-21T08:16:07.698Z'
    outcome: failed
    receipt_id: VR-ca5db5e9fe51df5b8c3d9a49
    runner: node
    scope: end_to_end
    started_at: '2026-08-21T08:14:17.594Z'
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    version: kibi.verification-receipt.v2
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dfc15bf423234bf4b6a95357
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:51:43.171Z'
    finished_at: '2026-08-21T23:52:05.159Z'
    artifact_digest: 341ce4a216d655dd10414a217ba55c8cf2fb312b94896a3a9cb0b13d322d4f82
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21988
  - version: kibi.verification-receipt.v2
    receipt_id: VR-146efa5adf11e9fe312efcf8
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:52:34.448Z'
    finished_at: '2026-08-21T23:52:56.797Z'
    artifact_digest: 97d2660b54efdeae1ba83a4ca9de21f7c8d529594d06000c78bea39bd46c097c
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22349
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e0bfcc1794740a7d95807def
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:06:04.362Z'
    finished_at: '2026-08-22T07:06:24.537Z'
    artifact_digest: 2910585bd35e251f609a7a4bd4f79fc7656526cfa9c2d551df59ce4499c00775
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20175
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ee69df8fb68164b0110dbcf
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:07:42.479Z'
    finished_at: '2026-08-22T07:08:01.867Z'
    artifact_digest: c69bb59ee955971275fe4cd56da92bd51f3ad0f62eee434693207d5802360834
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19388
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3e836a16f2ecfd5c777da986
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:25:23.710Z'
    finished_at: '2026-08-22T09:25:41.569Z'
    artifact_digest: 464c0210d2ecf72bc06ea5f5a7b16e3df8880879ae3ebd8a9bcb41d05f09879e
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17859
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9520488379f06ff382fc2376
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:26:48.409Z'
    finished_at: '2026-08-22T09:27:08.259Z'
    artifact_digest: f07975dadb832180cf3a7f4ddae9ed435b9a8046c9af70548bbf29d4b66dfcd7
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19850
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7a39047c43c18e953c59b3aa
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:09:08.223Z'
    finished_at: '2026-08-22T10:09:25.333Z'
    artifact_digest: fd38502ea65ccea6eda4c2f5cd6efb896d86ffdf9a902e69b1cf783b53b9de86
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17110
  - version: kibi.verification-receipt.v2
    receipt_id: VR-82b549474fc867ee0a7672e3
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:10:29.037Z'
    finished_at: '2026-08-22T10:10:45.528Z'
    artifact_digest: 6cd818c95eb190a26beb38f7510f912846f1ef7513822d379ff3ab3aff456150
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16491
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9156e2c0b45a3115766bb2e6
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:02:33.094Z'
    finished_at: '2026-08-22T13:02:48.639Z'
    artifact_digest: 70228144a73fb7874f40126a0941ef04c30a2b03087fa752bdb375075a0a4b90
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15545
  - version: kibi.verification-receipt.v2
    receipt_id: VR-36c4bb8df4aaa01c5cb4db0a
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:03:45.570Z'
    finished_at: '2026-08-22T13:04:01.524Z'
    artifact_digest: 78eacb489dfff1cad26c40a346b71f3af2b7a76eae23636ab1016154204e4949
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15954
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b1c22291885741618c3b3e19
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:46:41.146Z'
    finished_at: '2026-08-22T21:46:56.989Z'
    artifact_digest: da82f24408c7ae2953ef48c52766730a075375117cb1537b53b31fd025e35035
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15843
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c2c2a1e962cb9c81840eebb9
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:47:58.159Z'
    finished_at: '2026-08-22T21:48:13.227Z'
    artifact_digest: ff5fc6cce743567bac49ad309886773047b69824caea44fff0c87aeff39c37ba
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15068
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b67ad04c35cb096e1c9b1bd1
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:52:08.077Z'
    finished_at: '2026-08-22T21:52:23.025Z'
    artifact_digest: 1b4b8251fce48597e1daa43a59962765ad4028accfa878a837291f30502e513e
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14948
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ac412307755803a038284061
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:53:20.021Z'
    finished_at: '2026-08-22T21:53:34.822Z'
    artifact_digest: eeae2c6d792151bddff67bd108b331751938cf7b0ea8a1312a6b2c6df987b5af
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14801
  - version: kibi.verification-receipt.v2
    receipt_id: VR-10aa00c758bd03c95882efec
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:20:55.372Z'
    finished_at: '2026-08-22T22:21:10.361Z'
    artifact_digest: 20e19db077e5dcad6337a6a07ddcab44008c37d0d4d2cae272b6b41b675faff5
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14989
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f07d45d2a433e85e905aea44
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:22:05.946Z'
    finished_at: '2026-08-22T22:22:22.268Z'
    artifact_digest: fef1e762c08a7726f3df4f2da98d4bf5444b6c4abef2c952cf8218e208e55738
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16322
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cb02e793f36ede329a84d545
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:52:05.776Z'
    finished_at: '2026-08-23T07:52:25.033Z'
    artifact_digest: 7b6323f027ad9d09e3e105480993e30c236aed5949a2c5ae49cf4d467cf9dc6f
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19257
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b2b3bc71e40e86d480a43d84
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:53:31.737Z'
    finished_at: '2026-08-23T07:53:50.321Z'
    artifact_digest: a8a5a2d938ab2c5bab1f0193f3c7b531b26b7400122ff8895431917715c13826
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 18584
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4714cebd41ab9e05b46039b8
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:35:19.146Z'
    finished_at: '2026-08-23T08:35:34.645Z'
    artifact_digest: 66eab79775d48e8f1121a780530256e3f3562c974a72c26896162572a869a890
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15499
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f6a3599b91076ca59ab6de62
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:36:35.649Z'
    finished_at: '2026-08-23T08:36:51.849Z'
    artifact_digest: 9590da703b95cc66fc5653f915a6de9c7b70ec3f783e8931ef6fdaefce82d096
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16200
  - version: kibi.verification-receipt.v2
    receipt_id: VR-32106ff1f338adbbc8969fdc
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:31:46.042Z'
    finished_at: '2026-08-23T12:32:02.322Z'
    artifact_digest: b35132f058548ee1ffccce6359d99fcf60fb0c7b3891e9a8438cd98f621e1bd3
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16280
  - version: kibi.verification-receipt.v2
    receipt_id: VR-898e02c33a4585ff8bbd6126
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:33:00.365Z'
    finished_at: '2026-08-23T12:33:16.344Z'
    artifact_digest: 3a343168170c6b4cf185ef1bd6f73f6a6767c916a9790fa9019695f08d12192c
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15979
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8653a0936687e699aa823af4
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:32:02.864Z'
    finished_at: '2026-08-23T19:32:18.509Z'
    artifact_digest: d8bef4cf521177a572014c27a781481a33a2df5a2ac904f3169c166908a0af42
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15645
  - version: kibi.verification-receipt.v2
    receipt_id: VR-36041d6dc56d0e84bb2e2020
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:33:14.560Z'
    finished_at: '2026-08-23T19:33:30.728Z'
    artifact_digest: 4e800ea81ba96ee83ea3a5c093c85eee136e92947470e39fac9be199b6c1d649
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16168
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d4686eb5711b1d09f4fadcd9
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:58:15.535Z'
    finished_at: '2026-08-23T19:58:31.047Z'
    artifact_digest: 8f6fd178bf4e938fa37cc041a9035fbbdc5455ce1f89b466211f4646f68cdf65
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15512
  - version: kibi.verification-receipt.v2
    receipt_id: VR-edc7b5219d34ace310db5b26
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:59:26.983Z'
    finished_at: '2026-08-23T19:59:42.536Z'
    artifact_digest: ca266f1fe8b8de6d2d455c7a101b583b35db85cabcd1331256e1a41cbc2ef3fd
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15553
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb348b8795ac9dbb4382ba4b
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:25:40.514Z'
    finished_at: '2026-08-23T20:25:56.109Z'
    artifact_digest: 77c55f1489bbb57c7719ba35b07b6fb9826c8c5d8fd7a5bde0216ac844190326
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15595
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e546933849dc652cb1515b79
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:26:51.518Z'
    finished_at: '2026-08-23T20:27:07.433Z'
    artifact_digest: 8e52386beeec48d5e13825a19e196fb8f799e5c0ee5e7dd36b2de0221cd00fb1
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15915
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9ae0ebd68c108b100544eb1d
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:51:44.446Z'
    finished_at: '2026-08-23T20:51:59.411Z'
    artifact_digest: caa8f286041409f5e66a4ae1edc7e27903856f07e25d4223390351c61b6953a9
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14965
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7991b865dc83dcded0c473cf
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:52:53.189Z'
    finished_at: '2026-08-23T20:53:08.148Z'
    artifact_digest: 3bd1f0caa3bc24f356d261663791b6bf4bb959009c75e1c14c012d398df34277
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14959
  - version: kibi.verification-receipt.v2
    receipt_id: VR-12be4581f3874ef36ec3b914
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:32:10.090Z'
    finished_at: '2026-08-23T22:32:24.878Z'
    artifact_digest: 81b846a9582d97da909eec041f5e8dc2bd7080c16ce25994168ef960fe94af96
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14788
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7400bc1ca99504e63cea3084
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:33:17.726Z'
    finished_at: '2026-08-23T22:33:32.361Z'
    artifact_digest: 386e46ed991b24a7f8371755d450430c183f5c79b95dd8f35f84d08510e0508c
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14635
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dd8622b036e0d1857f683086
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:58:30.851Z'
    finished_at: '2026-08-23T22:58:45.843Z'
    artifact_digest: 8ffbf7608bb297ff74031e34a3b28dc8db48755d4e1da5bcd320e9539044f1e5
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14992
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6544ce36cac0770ac43b2900
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:59:39.327Z'
    finished_at: '2026-08-23T22:59:54.531Z'
    artifact_digest: 6768fd669e6f0b4582b7673de2200ad669dcc18459afcc0b15a7b309d3a2804b
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15204
---
