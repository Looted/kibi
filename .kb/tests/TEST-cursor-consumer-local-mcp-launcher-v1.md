---
title: Cursor Consumer-Local MCP Launcher Verification
status: active
tags:
  - test
  - cursor
  - plugin
  - mcp
  - consumer-local
  - launcher
  - verification
priority: must
id: TEST-cursor-consumer-local-mcp-launcher-v1
type: test
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-cursor-consumer-local-mcp-launcher-v1
  required_case_symbols:
    - SYM-cursor-packed-launcher-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-750eb0e4875b4b36e7eb66b0
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:30:07.887Z'
    finished_at: '2026-08-21T23:30:13.823Z'
    artifact_digest: 24aa6a2126c48a17c1c540880a6630b3e07988e951dbd8117cc29a5e097bdb5d
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5936
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1468d02a627aa4fe52ef7e41
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:05:08.342Z'
    finished_at: '2026-08-22T07:05:13.145Z'
    artifact_digest: 1565b616099dc97eb41464cd5020390f71f4b6b03842dfcb68cefe518df51b06
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4803
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c23416a5777acd51cca7fbfe
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:06:48.807Z'
    finished_at: '2026-08-22T07:06:52.589Z'
    artifact_digest: cd4b1d73e43e69dc167e4c4c5f6c915ea801763e26744b6c6e8532e3ff1573e9
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3782
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3eb2dc4876156651e9a34797
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:24:38.414Z'
    finished_at: '2026-08-22T09:24:41.902Z'
    artifact_digest: 39f80d522a2334ff7a40f620e0824b51fd583e7cfd8cb2fa33fccd3fde1eaa43
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3488
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b70bbd69efa56ac28d0266bf
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:26:01.527Z'
    finished_at: '2026-08-22T09:26:04.932Z'
    artifact_digest: a3c6674a1ccc1448e77823e1b9aff4f813f68ffc0907dd33b39748d6b24bc983
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3405
  - version: kibi.verification-receipt.v2
    receipt_id: VR-303176596bd8b7d31fd82920
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:08:24.058Z'
    finished_at: '2026-08-22T10:08:27.341Z'
    artifact_digest: 2aa9682431685c8cf5fabed1671a847c922fe0314774556409d8d41d541af85a
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3283
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8186df22c361cf0de51da88f
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:09:45.151Z'
    finished_at: '2026-08-22T10:09:48.476Z'
    artifact_digest: 7255e9a54003198a492fbdf506765d772463a64832ecd30f8e6e5e1c5451be5c
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3325
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c79645a8d57a70b55abb8173
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:01:53.755Z'
    finished_at: '2026-08-22T13:01:56.872Z'
    artifact_digest: f2bd564e2938ea39c880d9caa2fe4870a9f28c36e19bce5bc0368b00f97acdbe
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3117
  - version: kibi.verification-receipt.v2
    receipt_id: VR-17f420ed997df89d2d266df9
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:03:06.039Z'
    finished_at: '2026-08-22T13:03:08.932Z'
    artifact_digest: 3d83bce0f1c793a1f6de6c7d991b91a28ffcefd6afbe5169f83407bdb914e50f
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2893
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65e6d92f46e6df143786d18f
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:45:58.994Z'
    finished_at: '2026-08-22T21:46:02.206Z'
    artifact_digest: cfbd3c21f9dd7e9e08c1abd6791f58480a1ff9c08355f2cc25efb3c95141356e
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3212
  - version: kibi.verification-receipt.v2
    receipt_id: VR-78600ecda3410352d833cad6
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:47:16.266Z'
    finished_at: '2026-08-22T21:47:19.542Z'
    artifact_digest: 2b99b5dbc25e9b3f37c4ae0c7d11913874951c22e06c44c7e8138bf3fb495560
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3276
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cb011aba8282feb92ad6bd52
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:51:28.781Z'
    finished_at: '2026-08-22T21:51:31.864Z'
    artifact_digest: c30924aedeed81ea11f0e8fe6d3a032e940d72099be1966c72362f290bc1aea9
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3083
  - version: kibi.verification-receipt.v2
    receipt_id: VR-607f7b3eee3ecbb1f57d34f9
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:52:40.972Z'
    finished_at: '2026-08-22T21:52:44.002Z'
    artifact_digest: 8e34e2febd1c62902309e50598c8c1aff01497f62b1970b634df49ccce547438
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3030
  - version: kibi.verification-receipt.v2
    receipt_id: VR-248297003809150720fccbb3
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:20:16.569Z'
    finished_at: '2026-08-22T22:20:19.596Z'
    artifact_digest: 4b32b679cbbde044080efe2b93744e1e6b3b0dd442f4059781590e47c62d1645
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3027
  - version: kibi.verification-receipt.v2
    receipt_id: VR-40d119a4453a79e006a240aa
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:21:28.251Z'
    finished_at: '2026-08-22T22:21:29.874Z'
    artifact_digest: d6996e3f70fbe6211e607633f857014c444a4e5ef0dcd96a0c6776434748f95f
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1623
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eeb030d0ea2aa37f57201978
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:51:21.261Z'
    finished_at: '2026-08-23T07:51:24.503Z'
    artifact_digest: 506a55e94ae32deae2ead29b1a4ddc5cfecb912b25971da9a4d5e15d5ab74ca2
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3242
  - version: kibi.verification-receipt.v2
    receipt_id: VR-08e88c9b555b3c4fcf19899d
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:52:45.772Z'
    finished_at: '2026-08-23T07:52:49.748Z'
    artifact_digest: 8cd00ff2615f827458254a80b64f6b8b06959b39eeaa4ce9ceebcd354075b4c9
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3976
  - version: kibi.verification-receipt.v2
    receipt_id: VR-92366886af5ad1fcd952cf2e
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:34:39.789Z'
    finished_at: '2026-08-23T08:34:42.787Z'
    artifact_digest: 35931ebd4d697a95259bfea2c834e4f8d710abe8e6399354269c6f7b0e372e14
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2998
  - version: kibi.verification-receipt.v2
    receipt_id: VR-057a93aeb973016f02d6cbb9
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:35:52.612Z'
    finished_at: '2026-08-23T08:35:55.638Z'
    artifact_digest: 35e4f071af6b6cb83d925a7b5bfae6ece6e0f6e394a24c66190732946566bc1e
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3026
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2f9a6d43da5aece13bbc0d9e
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:31:06.288Z'
    finished_at: '2026-08-23T12:31:09.394Z'
    artifact_digest: 0cc165fe13e3e85daf81a39ec7bf889a823e7c89c9839311073b025432cd9e75
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3106
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9d521d4a88c181e6679d26c9
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:32:20.735Z'
    finished_at: '2026-08-23T12:32:23.846Z'
    artifact_digest: b4dc56b5cc2fa6a4cd8719e57d0916355c6cb5451a4e5f1966b5ecbf5ab1e88a
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3111
  - version: kibi.verification-receipt.v2
    receipt_id: VR-452d161b87407ae9eb0f3ac1
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:31:22.888Z'
    finished_at: '2026-08-23T19:31:25.976Z'
    artifact_digest: 17c53bfbf6ee455918eb9934b234e9cf9b123888f15082cfdfefb126a091f19b
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3088
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ff84ab334a750f6f6491ee2e
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:32:36.156Z'
    finished_at: '2026-08-23T19:32:39.040Z'
    artifact_digest: aa05688271afbffe117dee9e8f4ed28fe2076fb245e598fdadca0d9e8da1d0b2
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2884
  - version: kibi.verification-receipt.v2
    receipt_id: VR-868698cd1a73ea9708907708
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:57:34.950Z'
    finished_at: '2026-08-23T19:57:38.143Z'
    artifact_digest: 186215227b3609d7f9185cf005d6e991f6833385a1e8596c9d14f936364f0f38
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3193
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c5264a03c2f7064e7409f9a6
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:58:48.000Z'
    finished_at: '2026-08-23T19:58:50.825Z'
    artifact_digest: 8e6266b4fb3ad1de0988f7911fbda7c084d4e26dbba1a3df76e48bd1500e73d2
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2825
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ab7437c0ebc386d19514c894
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:25:01.722Z'
    finished_at: '2026-08-23T20:25:04.749Z'
    artifact_digest: aa5cff4e036f54e029a3666782f913bb7aa4fcd12abc39236ce7d4b9bc4379f4
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3027
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8f5153951668aeeec216e1fb
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:26:13.545Z'
    finished_at: '2026-08-23T20:26:16.432Z'
    artifact_digest: e99cb3724f69808260d06425048a3a0ba812c5b1781046e2f300b51b5fbf0f00
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2887
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9e2dbba61833039a32df8f03
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:51:07.525Z'
    finished_at: '2026-08-23T20:51:10.252Z'
    artifact_digest: 874ae18623d588405b8ab6ce49a5ae3d2a941ca17ecc993c067f999fd87dccba
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2727
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3cd6537a81d186c856ce36cd
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:52:16.003Z'
    finished_at: '2026-08-23T20:52:18.810Z'
    artifact_digest: 5fd4edaef5983fcbd5c21209527ddebe0957673f6d58dce67030214e1f6a1a1e
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2807
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3e04423fcafd14476ab27044
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:31:33.386Z'
    finished_at: '2026-08-23T22:31:36.086Z'
    artifact_digest: e5812b430ee0e1e6c8ce680c305c9924a648c8807682628e5f526ee819958fd3
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2700
  - version: kibi.verification-receipt.v2
    receipt_id: VR-18fbe5bb18354ec70457e2bb
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:32:41.108Z'
    finished_at: '2026-08-23T22:32:43.805Z'
    artifact_digest: 6aa55f7aef980e415cd037e52a509491c8274ea79b1fd17f729a1ba7017e6cdb
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2697
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f4a05c864bde2afb0b533b07
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:57:53.778Z'
    finished_at: '2026-08-23T22:57:56.576Z'
    artifact_digest: d231d4511be0661fc0da645ccec823c9fd7fba88b206245080db5bbcfa6cc8ec
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2798
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2013a5af6a2444c4612e608f
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:59:02.432Z'
    finished_at: '2026-08-23T22:59:05.231Z'
    artifact_digest: 39680cc09fa4f36d1ffb2d84bd291e8303f9a3e520214ef8eb91028d657148ad
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2799
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4b8113625d86541aab08d7b7
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:46:01.561Z'
    finished_at: '2026-08-24T06:46:04.904Z'
    artifact_digest: 54b25980c866f5233e4890c0d84a6e1f3dcdd6420640d09b48cd90e1aeac4752
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3343
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c1a42cd6c27c0c3b7065a6a3
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:47:42.672Z'
    finished_at: '2026-08-24T06:47:45.864Z'
    artifact_digest: e76a98c7092f87ce54543820e779af4981fa7635d854651e3326ef3271823736
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3192
  - version: kibi.verification-receipt.v2
    receipt_id: VR-96f6ea7c84e79c95f8376367
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:13:13.440Z'
    finished_at: '2026-08-24T07:13:16.406Z'
    artifact_digest: 3e9e2c48c3b01f79c530ff1867c597cf84e4d74788dc26ae675b6cb9db6eafc3
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2966
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ce50fc826c2420808eba2cd0
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:14:29.575Z'
    finished_at: '2026-08-24T07:14:32.516Z'
    artifact_digest: f6a2be07ad06a005e013a8d36a3e9c3b5b248db63021b60cae13debe3f8165f9
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2941
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fc264a26c9c99d19fe9c0fb4
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:09:21.720Z'
    finished_at: '2026-08-24T08:09:26.840Z'
    artifact_digest: 8728e17fd011dbf8b8cbdbcee730a9a17305af69d3cd000538f28151a028e6f1
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5120
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f654b9eebba49bfe48bdb6fc
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:11:06.663Z'
    finished_at: '2026-08-24T08:11:10.680Z'
    artifact_digest: de992eb5cf758d4eb759eaddf4516c64efc9cbabf6b77265a601be52595445de
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4017
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b1d2ee232c8e93ffb16cd390
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:41:36.823Z'
    finished_at: '2026-08-24T08:41:39.944Z'
    artifact_digest: 3e788ceb8f551ae520bc487a838093e1157c0333e9212ecff1c6024af81bef7e
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3121
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a04ac108e248e89fb811d011
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:42:59.916Z'
    finished_at: '2026-08-24T08:43:03.122Z'
    artifact_digest: d9474e4c5ae5bd21f8829b7cd2626f434e30419d3e72b421d4c82eedf0973f88
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3206
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6f11e1a5ba97e14ca8500f1a
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:11:41.628Z'
    finished_at: '2026-08-24T09:11:44.885Z'
    artifact_digest: 8ecccc25c20256ed95adaf8e9269cb3ca2a3ac77c26111b4edecac896cd5acc3
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3257
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2d6c0965886dd9391f4a314c
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:13:04.028Z'
    finished_at: '2026-08-24T09:13:07.616Z'
    artifact_digest: 5ac943bd9232a58f4ae31f9a85527df3f00da50f1cf60520368516b8cc6c1fcc
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 3588
  - version: kibi.verification-receipt.v2
    receipt_id: VR-249202fbd68705780fa95659
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:23:13.173Z'
    finished_at: '2026-08-25T21:23:16.026Z'
    artifact_digest: e82eac98dd41b074a098d9dfacd15940ebe0434078ece6afe431664c39883b3c
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2853
  - version: kibi.verification-receipt.v2
    receipt_id: VR-aa31bb17671cf11d71264ee8
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:24:24.054Z'
    finished_at: '2026-08-25T21:24:27.050Z'
    artifact_digest: d0616835b4ceff5350c02ae85b17b9251b61004d9948b7ec10a03fbcaa93e662
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 2996
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6f8814b58224b573bc62ff08
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:10:21.070Z'
    finished_at: '2026-08-25T22:11:19.550Z'
    artifact_digest: 05b9f8bc1b584abba295b86e2941fbc11ff1767294eb76bb32db32f35f018c64
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 58480
  - version: kibi.verification-receipt.v2
    receipt_id: VR-252bb55a3907920752e8da4b
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:13:42.499Z'
    finished_at: '2026-08-26T14:14:40.100Z'
    artifact_digest: f6611ad165146bf942190e769ec49103e92d2b1e0a6cc2dbae5bc96336145edc
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57601
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a0ef3856a13b189d50760012
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:06:36.431Z'
    finished_at: '2026-08-26T16:07:39.253Z'
    artifact_digest: b99fc5625f0683c397164615df20a09903b03eae644908dfd5dc957b3bf89fb6
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62822
  - version: kibi.verification-receipt.v2
    receipt_id: VR-43fc6101d9f00f006f2b8c88
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:08:17.349Z'
    finished_at: '2026-08-26T17:09:19.684Z'
    artifact_digest: 02d81627c4e442cec429f8b475e97a91ff96daf7ea7b0e0e21c076ff012dd607
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62335
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1bed049010df19c72c535266
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cursor-consumer-local-mcp-launcher-v1
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:14:13.376Z'
    finished_at: '2026-08-28T10:15:16.212Z'
    artifact_digest: 79712234bc177e153c3a92a11b489d2f50b34a4eaac061dc6064228a938f3575
    contract_hash: 2ef3e3c6afb2b4be70e13f430aba14e01effd215e7435c61a7b332a23d3f7b96
    case_results:
      - symbol_id: SYM-cursor-packed-launcher-e2e
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62836
---
