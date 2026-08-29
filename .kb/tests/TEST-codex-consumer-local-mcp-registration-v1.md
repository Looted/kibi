---
title: Packed Codex Plugin Resolves Consumer-Local MCP
status: active
priority: must
text_ref: documentation/tests/e2e/packed/codex-plugin.test.ts
tags:
  - test
  - e2e
  - packed
  - codex
  - plugin
  - mcp
  - consumer-local
id: TEST-codex-consumer-local-mcp-registration-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-codex-consumer-local-mcp-registration-v1
  required_case_symbols:
    - SYM-codex-packed-plugin-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f9ef85d23fcb61c379332cbc
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:46:08.552Z'
    finished_at: '2026-08-22T21:46:11.666Z'
    artifact_digest: 1b5c4163f6a8b881cd3e26b4c60fccf9b240242e329ab9c4e201fa3bc85e7818
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3114
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2994b6b28c2a12c5784553a1
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:47:25.499Z'
    finished_at: '2026-08-22T21:47:29.616Z'
    artifact_digest: f561615736d132bf0e18696c2e4ba7b7c59d0e6c09713c6a57ce406301850e80
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4117
  - version: kibi.verification-receipt.v2
    receipt_id: VR-880fa11df1dd047a649eac5a
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:51:37.571Z'
    finished_at: '2026-08-22T21:51:41.871Z'
    artifact_digest: dd4f17eb1330fd61eef2d0df4c4f9e2a4974d3e9972b238b726fb9c9c018d20d
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4300
  - version: kibi.verification-receipt.v2
    receipt_id: VR-152e2c49ce9730bde1ba1547
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:52:49.629Z'
    finished_at: '2026-08-22T21:52:52.095Z'
    artifact_digest: ddb0fdf983ad4b09677df6a029fe8e07b35187d874ab188103d910072c345a39
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2466
  - version: kibi.verification-receipt.v2
    receipt_id: VR-34fd086e625708ae444862ab
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:20:25.185Z'
    finished_at: '2026-08-22T22:20:29.330Z'
    artifact_digest: 2461a8c0e4237e2fe110a9f6c32c38273aaaafcfb1f87d9046b4be14b54d3e17
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4145
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6a142bab12b30c55421911d2
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:21:35.672Z'
    finished_at: '2026-08-22T22:21:39.566Z'
    artifact_digest: 0fd573251e1e9f6c1e3573fd219b86127abdca07c85322d6645fd8d462b12e6c
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3894
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eb061198b202f72c928e31c1
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:51:30.810Z'
    finished_at: '2026-08-23T07:51:35.004Z'
    artifact_digest: 428e0f89f221ef6f284d60496763c0c5c50d7520d74e36fd367a310ae4c90757
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4194
  - version: kibi.verification-receipt.v2
    receipt_id: VR-79aa9c73377396f2c47b72af
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:52:56.319Z'
    finished_at: '2026-08-23T07:53:00.547Z'
    artifact_digest: 3c0c0fee87938eae92c04a4e005fc33ce1fd82e2dc3bc75386936eb8ffca64a9
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4228
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ad7477476249209ddb9ab980
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:34:48.118Z'
    finished_at: '2026-08-23T08:34:52.039Z'
    artifact_digest: 1dcc82a33c7fb3b821cf2cce03b7fe1f22306251d019f46d9202eb4a491c66be
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3921
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3127e49297812d0b7662f670
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:36:01.641Z'
    finished_at: '2026-08-23T08:36:05.651Z'
    artifact_digest: 88803923be0977c3e80739516852987bc02ff53926d35e13e73449f385e0ff1c
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4010
  - version: kibi.verification-receipt.v2
    receipt_id: VR-195ffa33c9f4300d33ff0a1d
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:31:15.064Z'
    finished_at: '2026-08-23T12:31:19.198Z'
    artifact_digest: ae26fd548216ccf323e19e3204e0bfdf5f9c18f65e5c74013e6e413050f32bf2
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4134
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ffd088a7811c5d0a6ced26e
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:32:29.535Z'
    finished_at: '2026-08-23T12:32:33.281Z'
    artifact_digest: 8fabb20f1480bf0e09012ec5036f8749fc5fc3d5a523f3f7d83634019a7d1e25
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3746
  - version: kibi.verification-receipt.v2
    receipt_id: VR-443ead9c46f08b3426e35033
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:31:31.646Z'
    finished_at: '2026-08-23T19:31:35.550Z'
    artifact_digest: e94ec7f2bfd8e365b20e1be6c4ce96a5f9fbc713ca3c791950cc66dca9180640
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3904
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0f7395af60a208a12d3d84f5
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:32:44.341Z'
    finished_at: '2026-08-23T19:32:47.997Z'
    artifact_digest: 978737c23e17197ef1bd2b4f9bc312d3ed74e55856953a91de5234bfbd10ef4a
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3656
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0938f93ae66376a7963ad0ee
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:57:43.882Z'
    finished_at: '2026-08-23T19:57:48.193Z'
    artifact_digest: 44653d244ec6e773916dd2beb9d45d558b33198f2670caa97a1aa76e01660d70
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4311
  - version: kibi.verification-receipt.v2
    receipt_id: VR-64e74d88bf79f1ff2b032ef4
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:58:56.435Z'
    finished_at: '2026-08-23T19:59:00.587Z'
    artifact_digest: f2b6b02844bf9d52cdc241670ec9a4d7201bc3db61625e2c6e030b392ad83eb5
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4152
  - version: kibi.verification-receipt.v2
    receipt_id: VR-838dfcd26919f9fffada0370
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:25:10.040Z'
    finished_at: '2026-08-23T20:25:13.927Z'
    artifact_digest: 260946a197bd53be96a5d9618b37c93c14d462abab4b284262dbfae1425f8a3e
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3887
  - version: kibi.verification-receipt.v2
    receipt_id: VR-43040da9ad643b2f977798f4
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:26:21.766Z'
    finished_at: '2026-08-23T20:26:25.427Z'
    artifact_digest: e77af1c534db5f083f76d9c5301f33638a1c145327cc77fdd99e9f2bf498aeb8
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3661
  - version: kibi.verification-receipt.v2
    receipt_id: VR-879a369928150f549c8e2d81
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:51:15.357Z'
    finished_at: '2026-08-23T20:51:19.061Z'
    artifact_digest: 0cbc423e1492ce3882da871b4231de37a197c53cc62c21bc66d4e72780c5ec33
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5195132233bd606490e3f923
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:52:24.051Z'
    finished_at: '2026-08-23T20:52:28.070Z'
    artifact_digest: 64efb8aa614424f7ceff36db049b2a7e0e85566279f3a8fee48b5590da6475f1
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4019
  - version: kibi.verification-receipt.v2
    receipt_id: VR-63a7cab6d7c2c14aa6c13413
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:31:41.265Z'
    finished_at: '2026-08-23T22:31:45.097Z'
    artifact_digest: 0a275a25b0d3252a6a7dfd84ffb63b79d412aa8ba234fe4a9821afc261fa9665
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3832
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d40e366d0e6f933bb4e7c06b
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:32:48.963Z'
    finished_at: '2026-08-23T22:32:52.447Z'
    artifact_digest: 8369dd95afb59547665d37525450ef9a7bb21fb163e01294f8621d4451b4d08f
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3484
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2de561a6fb8d141285eb8ce1
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:58:01.679Z'
    finished_at: '2026-08-23T22:58:05.317Z'
    artifact_digest: 2ba6ead3d564c70196700ae33581b138d868bc6f0d9f2d645762556dd44119d6
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3638
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0a453777ff0866c8ffff87b3
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:59:10.477Z'
    finished_at: '2026-08-23T22:59:13.979Z'
    artifact_digest: 6ec20d048c99eac1ff917ab4fb2c941cc9ef56b5df3de494785b8729e4fb807d
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3502
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e140d10bc883cad0d5347ec7
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:46:12.934Z'
    finished_at: '2026-08-24T06:46:21.374Z'
    artifact_digest: 8ba769472e7a45d26929831e7bab2468850298af0fae5c26a6db37a2aac2958d
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8440
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bcd8e81829f61dd742abc131
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:47:52.553Z'
    finished_at: '2026-08-24T06:47:56.993Z'
    artifact_digest: 5524762b7acf96d1b319034159dbbdf0b63a9f7a3016d01673cd338859810c8e
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4440
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b59d68a11fb98ba1f46c321b
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:13:22.523Z'
    finished_at: '2026-08-24T07:13:27.482Z'
    artifact_digest: d4c06a4ca8f05e41e0574ab5a01dda0bebaa8be7651e549fc6cc1934f6fb9835
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4959
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e1d2af1bbf9be305c02ef081
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:14:37.947Z'
    finished_at: '2026-08-24T07:14:41.675Z'
    artifact_digest: 4036aeb31c09c6a9b96d705f013317dd6b45d867ac835168d4352cfc948b6244
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3728
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ef7a8cb53cb8dabfb890d5e
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:09:39.037Z'
    finished_at: '2026-08-24T08:09:46.707Z'
    artifact_digest: a9935a7d0159460669b707c2ff0361d3eaa2685ac59bbbbbc6ef632ee14c10a6
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7670
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7b114271cae313ab9886a167
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:11:17.783Z'
    finished_at: '2026-08-24T08:11:22.418Z'
    artifact_digest: e7876bbd436a49a06bca37e1673bebd5ddebe8b1af0a20c64a811a34f20ae6fa
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4635
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f21951da7201c759f1ce98bf
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:41:46.632Z'
    finished_at: '2026-08-24T08:41:51.532Z'
    artifact_digest: a838389ae4281c31693947190f8f77770ef161c0ff978ce3375f4091b5b71043
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4900
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6916ea28fc2700c7fd40457d
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:43:10.027Z'
    finished_at: '2026-08-24T08:43:14.341Z'
    artifact_digest: 66aaaade2b686fd4d8cb6d77e95d31f71a302cb14c4ff1a77dce356149064549
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4314
  - version: kibi.verification-receipt.v2
    receipt_id: VR-80cbf1caf0c46dbbdd6563ad
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:11:51.237Z'
    finished_at: '2026-08-24T09:11:56.387Z'
    artifact_digest: 3b2bd60a2a7e3669709459f8b527cdd5e1d7b619f08824f48cb108cffcf0e435
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5150
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc24fe2f395981164f5f4ccb
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:13:13.613Z'
    finished_at: '2026-08-24T09:13:17.957Z'
    artifact_digest: 78bb69dc3f7b552fa093f8b12a0c95db6555f3468658d51f89f88d0c1d1f1b81
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4344
  - version: kibi.verification-receipt.v2
    receipt_id: VR-453acb873e11978699e322f4
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:23:21.285Z'
    finished_at: '2026-08-25T21:23:25.111Z'
    artifact_digest: 56d20241cbeafbbb842046a38ed07b9ebf32f154bf1edd8d359b3182fd557db2
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3826
  - version: kibi.verification-receipt.v2
    receipt_id: VR-47b157d9d72785e157bc166a
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:24:32.529Z'
    finished_at: '2026-08-25T21:24:36.103Z'
    artifact_digest: 35d6909f0e6b51315d7a2fb7fc29e6bfef5529f83aa21544fdde3a16815e1708
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3574
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7384a6886bfb09e555cc4ca5
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:11:25.133Z'
    finished_at: '2026-08-25T22:12:23.431Z'
    artifact_digest: b75019a315ef6081aa512c52a3fe8534b5dcade6ae7479fde0c2241b0745a15d
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 58298
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1071310e4971509ea137df84
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:14:45.783Z'
    finished_at: '2026-08-26T14:15:43.478Z'
    artifact_digest: 118b23a5d876bb0dd22129e6a1a39291242570728a60a3335ad73a9c7ce81be4
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57695
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a7e550c54c771c8cd1810eef
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:07:45.319Z'
    finished_at: '2026-08-26T16:08:48.641Z'
    artifact_digest: e31caf74c1731c401528b40ba5fc74f403a961ef25d6fa572c6dd6ac0a763002
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 63322
  - version: kibi.verification-receipt.v2
    receipt_id: VR-73a048097067a89f67ce38b9
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:09:26.083Z'
    finished_at: '2026-08-26T17:10:31.868Z'
    artifact_digest: a7788fe36973d25994fbfb10c4ddecf6f06db5849ab63e23108ee130e5cdce2e
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 65785
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7c621c05ec3118359a358c2f
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:12:59.832Z'
    finished_at: '2026-08-28T10:14:07.909Z'
    artifact_digest: 926dcfff17e6bcdc3f910becd67c2a8f7e31ac4517aec05ffd6cb03c79f14430
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 68077
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b795b57cbbf6bbe5d1b6fa87
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:22:09.181Z'
    finished_at: '2026-08-28T13:23:06.779Z'
    artifact_digest: 9fb3f3bd68c107fcbe1c9a11e20728b56ce4cb70576a4bae477476e29a9a5263
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57598
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7803f38305c4e048457c9f73
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 33d4b9dffe76a9a1d3f539114dacfdf1ef1f729074c06875b6ce811201d1d344
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T00:57:23.854Z'
    finished_at: '2026-08-29T00:58:39.986Z'
    artifact_digest: a7473c21ce81c353985dca99badad395514ef40fa276eaf057719b5a712f0809
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76132
  - version: kibi.verification-receipt.v2
    receipt_id: VR-73da5d943c3b5d5fd24d5f1e
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:10:59.687Z'
    finished_at: '2026-08-29T01:12:01.693Z'
    artifact_digest: 4f6983d4eed9b1b91d1cc05537f65d496c248951218fb7051c9886bc54fe4952
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62006
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b0c6a6cddc6a69cb451d2c55
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:28:28.687Z'
    finished_at: '2026-08-29T07:29:05.516Z'
    artifact_digest: 9cd41ba924a9933a40e3c30c633125ff06f32323439141d7381890b2b0198359
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36829
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a9d3c2745eeac20159c66ccc
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:00:34.714Z'
    finished_at: '2026-08-29T08:01:08.357Z'
    artifact_digest: d23e6a2a218a040fec17c56563339cdc28fef294d9e1c3324aeeb17336e5abf3
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33643
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0fd1eee9575bf59a727bb25f
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:32:13.453Z'
    finished_at: '2026-08-29T08:32:48.305Z'
    artifact_digest: 7603763a851808e219577fd18b3f7c23a76fb78365f5c5bee277b7a468b7e98a
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34852
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ff8a6fc3347859089e4c1cf7
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:21:36.227Z'
    finished_at: '2026-08-29T09:22:10.058Z'
    artifact_digest: 5fe8ae94d7f831e33d04555098d46363cff017df936a90abac97d417f7613224
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33831
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7be796a37a878e37f523f45a
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:51:40.098Z'
    finished_at: '2026-08-29T09:52:18.180Z'
    artifact_digest: 5d51037bfaacd80fc794ff944af4c95bf902ef62d6f2d4a1d03c4910b6af8791
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38082
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0cca89a26fe7261b7174f064
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-codex-consumer-local-mcp-registration-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:31:18.607Z'
    finished_at: '2026-08-29T10:31:51.968Z'
    artifact_digest: 70aff71c18960cbc8cfac89025db8727e948be0f8db4efdcf696a9cee021fda9
    contract_hash: b61976658f1d49e6cfc44dc3bff701c6b47da2d8ef43ec94c427917a4bb3898b
    case_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33361
---
