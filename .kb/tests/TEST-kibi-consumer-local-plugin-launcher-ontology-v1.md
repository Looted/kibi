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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5369524067ed08d1322dad95
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:47:03.866Z'
    finished_at: '2026-08-24T06:47:23.329Z'
    artifact_digest: d9dfdab27dec8eb9f3a02312bbdc9dd3f7e70c58e343e54eadc6316ffd0f3e5b
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19463
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e2d2d87690800d1fd5795c6c
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:48:28.879Z'
    finished_at: '2026-08-24T06:48:47.162Z'
    artifact_digest: 91ab879f2c017dcabebf49bdfc3c0f096aba90868a510a0d3e4cbee1add88c2e
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 18283
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3352fcd67c41bacdfecc2f91
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:13:55.676Z'
    finished_at: '2026-08-24T07:14:11.650Z'
    artifact_digest: a0ac7f995d60a874fbd9309794106ae3b4f198a5a6385665224eab7eb0e553f1
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15974
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a82ca19c3e846e61bdfd8373
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:15:09.102Z'
    finished_at: '2026-08-24T07:15:24.990Z'
    artifact_digest: 49298f6838a9e8a18945cfc63d4eb3401d9c94be189a8f00959c04f6627119be
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15888
  - version: kibi.verification-receipt.v2
    receipt_id: VR-53ce849274f0317193a6499d
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:10:24.320Z'
    finished_at: '2026-08-24T08:10:44.107Z'
    artifact_digest: e507112a01df250959f79dce31e88df7a8d97c62cc14c17cfb0ff12cd69f698c
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19787
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a2a4f966f814d72e1ecb2df9
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:11:59.404Z'
    finished_at: '2026-08-24T08:12:20.443Z'
    artifact_digest: 8c1472083fe0aaec36ed1c6f3ff089f3410dbd7f3e239008200324f14be2b693
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21039
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fa7a25e933afa5fdaa569d96
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:42:20.866Z'
    finished_at: '2026-08-24T08:42:39.265Z'
    artifact_digest: 41b23c812c6830c254931a50d76874f46dc56e7b66b495ab6170c27753b894ef
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 18399
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b16920b5b94eda86deb91377
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:43:45.344Z'
    finished_at: '2026-08-24T08:44:03.278Z'
    artifact_digest: f8d07a5be0c7390522ff176127b13d776f18fcfbcab85327af0a688e415ced00
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17934
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0bc996fc8673aa538657b42d
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:12:24.262Z'
    finished_at: '2026-08-24T09:12:41.552Z'
    artifact_digest: 0e8694eaf98dc9be44a75f1d9b4f8aaa065e16047114823f03ab95b47b0c18fd
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17290
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2bbcca54232223a248dfd911
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:13:51.318Z'
    finished_at: '2026-08-24T09:14:10.660Z'
    artifact_digest: 91c926972b061778b45c7875cab1d4d247e158ef6a6d559c902b585f4141f119
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19342
  - version: kibi.verification-receipt.v2
    receipt_id: VR-713bb8f8048bfa14d365c72a
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:23:51.484Z'
    finished_at: '2026-08-25T21:24:07.152Z'
    artifact_digest: 59799c9cd383731c0e4b7065d782cb242b7ce957746a379fd1cb59afba18551c
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15668
  - version: kibi.verification-receipt.v2
    receipt_id: VR-49519ea95cbc8217f5de214b
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:25:02.717Z'
    finished_at: '2026-08-25T21:25:18.747Z'
    artifact_digest: 66f5f3aa55596aa42ea8b157afa89fe5ef42b433b215ac4d727684395a7f59da
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16030
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ff00ca5290179b7e194c366b
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:13:45.492Z'
    finished_at: '2026-08-25T22:14:56.841Z'
    artifact_digest: 53ba481ed48d9f47b3a801bf01ccd850ae247206b86431c4b2f409bb8e35cc1c
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71349
  - version: kibi.verification-receipt.v2
    receipt_id: VR-46426842964adcf882184778
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
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:17:04.465Z'
    finished_at: '2026-08-26T14:18:11.770Z'
    artifact_digest: 191a3f49eb5f4035d14411559fda44320f1176320d189184cd5334195d242342
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67305
  - version: kibi.verification-receipt.v2
    receipt_id: VR-59324dc1b266fd98fb316bee
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
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:16:32.707Z'
    finished_at: '2026-08-28T10:17:44.282Z'
    artifact_digest: 359fd37b48b35894fd032ea6b484df260ce1956bf06014fdb6b793de26880bed
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71575
  - version: kibi.verification-receipt.v2
    receipt_id: VR-124adb319dd77575c4bbb1b7
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
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:25:28.731Z'
    finished_at: '2026-08-28T13:26:39.461Z'
    artifact_digest: 2b394980deb8865b36be40a73182535f792fff578944cfd5bac3d9cb674a56ff
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70730
  - version: kibi.verification-receipt.v2
    receipt_id: VR-258ada579df1ebf9de4f257b
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
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:14:16.225Z'
    finished_at: '2026-08-29T01:15:22.215Z'
    artifact_digest: 562fde2e159c1b79f5604cd39482444365f1b1398b9f51a6069a05210c15db82
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 65990
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6075bd67422876984147355d
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:29:48.449Z'
    finished_at: '2026-08-29T07:30:29.270Z'
    artifact_digest: 9d4ca6a156255b4e4926adcd98c41eea62e929a226ebd87bd079c0fa98dfa076
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40821
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9d0a7c0e8c08c8d9877dd87a
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:33:43.103Z'
    finished_at: '2026-08-29T07:34:27.436Z'
    artifact_digest: 30d8a16d28f36358333d8e041414fd0f37a7cc0081e8b5a3c63abea11d762d5d
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44333
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5d5d4bc32853c9c3b0544ab2
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
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:02:33.841Z'
    finished_at: '2026-08-29T08:03:14.203Z'
    artifact_digest: b0b18ce029595c9117d8a822fd54935e68fb961904f76561b0804b921b5e9543
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40362
  - version: kibi.verification-receipt.v2
    receipt_id: VR-62d8ff7ab137da6051e65044
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
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:34:16.461Z'
    finished_at: '2026-08-29T08:34:57.236Z'
    artifact_digest: 31308ca84dd6acb8c10e78e4e883c3ce7aee745788df6dcb7babdad4883ce5e5
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40775
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bd7426016a44a97530de5d48
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
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:23:33.823Z'
    finished_at: '2026-08-29T09:24:16.182Z'
    artifact_digest: f738bcb113cbf7b560888a7d689988d9413a361883687653fc02c079dada28b1
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42359
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d1cf119fb19801cbd2d38f31
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
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:53:38.842Z'
    finished_at: '2026-08-29T09:54:17.680Z'
    artifact_digest: 40dbe192ff66f270871dba3d37aaceeec5931c6aaafbb3b8289455a2a5cc4fd6
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38838
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b711afe6cd153a6832342891
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
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:33:17.221Z'
    finished_at: '2026-08-29T10:33:57.430Z'
    artifact_digest: d40afce054dd0550db7a5c589530b62f5e313d5020dc0c4480918d44b2c3e340
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40209
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9affd7b9e4e47e08a9e2980a
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
    code_snapshot: 4dcb52daacd2e6301cb225622dbda1c10a95ea1252b73faa3a34235c61fe9d71
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T11:04:54.846Z'
    finished_at: '2026-08-29T11:05:35.194Z'
    artifact_digest: 351bd7668b845e92a2adcfd39b7653eb3097186c8ec862013af0418c807eaa24
    contract_hash: 4756e25292dbad76f28ebf29da8f8435dffbbd5b376d7eab696609dd1a84006b
    case_results:
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40348
---
