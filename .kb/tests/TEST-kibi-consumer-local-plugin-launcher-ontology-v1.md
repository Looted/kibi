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
---
