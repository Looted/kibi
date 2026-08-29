---
title: HTML requirement health report CLI and renderer tests
status: passing
tags:
  - cli
  - report
  - html
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-kibi-html-health-report
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-html-health-report
  required_case_symbols:
    - SYM-e2e-packed-cli-html-report
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8bb05e8574f21abde0b37277
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:03:47.527Z'
    finished_at: '2026-08-16T19:04:46.931Z'
    artifact_digest: 407e4b689a0d76fa085a64b5d88f5b4403bc9b26f64023c88671f6ae94ab0016
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 59404
  - version: kibi.verification-receipt.v2
    receipt_id: VR-adf918155aa66f22baf16d15
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:22:16.407Z'
    finished_at: '2026-08-16T21:22:58.140Z'
    artifact_digest: 96b9b9700fdf133046ce72dfe0993c2cc4ec6d9d0129ae195143308cfa4b2bfa
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41733
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4294aef60b312f3ec7fac4f3
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:47:53.522Z'
    finished_at: '2026-08-16T21:48:36.097Z'
    artifact_digest: 602fe8c449c422b6f0d25360fe5a600a11e022fc7389b439a72837f046d32521
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42575
  - version: kibi.verification-receipt.v2
    receipt_id: VR-df90f8ee8a0f39ac5af6e2b6
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:09:58.517Z'
    finished_at: '2026-08-17T12:10:38.803Z'
    artifact_digest: e62f2e691a807c85ebf84d2a4bebe09034ec7e75abd8a0553b17b0b37ce964bb
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40286
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2fd7803b3270677ec4db9c7c
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:00:28.122Z'
    finished_at: '2026-08-17T21:01:09.946Z'
    artifact_digest: 9b92cdb890a19b0f1eddee7f049119db3a460727a169ff5bc9e33f3fff905120
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41824
  - version: kibi.verification-receipt.v2
    receipt_id: VR-783f49fb8a78081f369fff23
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:14:54.800Z'
    finished_at: '2026-08-18T07:15:40.126Z'
    artifact_digest: 1b93d48c04874b5a8fab1156a2b230a36d74f86d70dd5d01f8681d9af78d69bc
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45326
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b4e6ece25dec76691b54f229
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:43:30.347Z'
    finished_at: '2026-08-18T10:44:16.958Z'
    artifact_digest: 21f85561416ca73000577bbcc93ee11d29a2447a7ade7e2f302ae904f8ab12c5
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46611
  - version: kibi.verification-receipt.v2
    receipt_id: VR-14cef3e64d607ef303ed3abc
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:52:48.578Z'
    finished_at: '2026-08-21T21:53:03.950Z'
    artifact_digest: 106e5c84b831c4c73cccf77797dd8a5c0b009804609438f21b748807c87fd561
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15372
  - version: kibi.verification-receipt.v2
    receipt_id: VR-57e8702622c1132013be5ff2
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:08:12.245Z'
    finished_at: '2026-08-21T22:08:27.132Z'
    artifact_digest: ea3cb423f675a99929fb8cd2ae3dbb1f85772833507e4992265ab0c1dcf4db0e
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14887
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4a3391d8577a3f0342e39270
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:58:46.417Z'
    finished_at: '2026-08-22T00:59:06.256Z'
    artifact_digest: 74c614f71d0533f9546d367c14350be38f4b7650c1b598903d36159d28c3d900
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19839
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5f7265accda42446a878d53e
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:00:37.089Z'
    finished_at: '2026-08-22T08:00:52.804Z'
    artifact_digest: 3bfa656444070ebaa964f9e27819c2a02a53e2e3e466d88c4a2f6dd550d13e6f
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15715
  - version: kibi.verification-receipt.v2
    receipt_id: VR-41cdef95ca04f8ff128aa5dc
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:48:41.785Z'
    finished_at: '2026-08-22T09:48:55.838Z'
    artifact_digest: 6e84851a56bc5ae2c2ca82a346768f7f19e6774442955e6d99347cc076bc38ce
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14053
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ce92bb130f7bae79fce8fc6f
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:44:37.519Z'
    finished_at: '2026-08-22T12:44:49.843Z'
    artifact_digest: 32fcfd5fb717fb27d28ee603ca921d7617434a9897ad4ded37a30af2d1f244bd
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12324
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7aedb6f92983e3c7c2fc01d7
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:06:28.679Z'
    finished_at: '2026-08-22T21:06:40.823Z'
    artifact_digest: 203b53935d2952ed2d249c3c2531120df5bc1c3956f35380c91f8072787f8baf
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12144
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7ee0f7ef26ee79b5205f043
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:33:16.454Z'
    finished_at: '2026-08-22T21:33:29.132Z'
    artifact_digest: c967e166512deacadaa0e89f626407d38844545cbadf6f31b5a29e83ff31359b
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12678
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1b574a592d3d1f1bd196fee2
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:03:21.146Z'
    finished_at: '2026-08-22T22:03:32.257Z'
    artifact_digest: f8d8c746a1d034438ee1dae923d47c7eb12d296b3d57d803a9eca6a35d0d6909
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11111
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a603170515c77fe0371705b6
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:33:15.838Z'
    finished_at: '2026-08-23T07:33:28.144Z'
    artifact_digest: f78b3acb433e5f87b6b4c896df492ca7ee2505e44d2127c2c5714faac07a4deb
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12306
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dc0ac292b522d584df4c203e
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:16:54.342Z'
    finished_at: '2026-08-23T08:17:06.690Z'
    artifact_digest: 6f0db75f6e55218295ffd22c0651abf788f97f458d14c8056d059a8baac54ddb
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12348
  - version: kibi.verification-receipt.v2
    receipt_id: VR-70f8684361693c91c7ffe49a
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:13:59.898Z'
    finished_at: '2026-08-23T12:14:11.733Z'
    artifact_digest: 9423beb89032f362394f14c23f25724f02a8b22615872dfaae20f81188e66043
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11835
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e90e6fc0747a682a31c9999e
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:13:53.125Z'
    finished_at: '2026-08-23T19:14:05.851Z'
    artifact_digest: 98583f29f73ec038f674fc0905df09f5c5f8945e9741f8a4fd7e26366ad19439
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12726
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8072a540f11d2822ae5c40ad
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:40:02.863Z'
    finished_at: '2026-08-23T19:40:15.021Z'
    artifact_digest: 9bd939c7dd0623a99d8f8ef8aa63cb5ab09405e53a6e31e842cce874c14743d8
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12158
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4ad8b5e2e7a69deff34d6f5a
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:07:56.077Z'
    finished_at: '2026-08-23T20:08:08.134Z'
    artifact_digest: b6b41572d4e5529f08ccbd936918e3cf143ce5a821adcfb66bc231e18b75b99b
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12057
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4a6799e01b52a9facecb733f
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:34:13.279Z'
    finished_at: '2026-08-23T20:34:25.370Z'
    artifact_digest: bcf365d6fa035870f25c0a76aa327c2490f16e1bbf2246059339fd39669b6004
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12091
  - version: kibi.verification-receipt.v2
    receipt_id: VR-adcf91d60a7bd3e3dbc5aa06
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:15:01.837Z'
    finished_at: '2026-08-23T22:15:13.605Z'
    artifact_digest: 38673c4169c7b520e3b8c9c36735ad8bc897f25ecddbcfa27af830aa4fc3c3fc
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11768
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5db995e4b57875f7623e9dcd
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:41:12.940Z'
    finished_at: '2026-08-23T22:41:24.564Z'
    artifact_digest: 1e571531c52e19b04d85b5042d1821f0712775953c7bb3b8e2f46989484fc1de
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11624
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d604164f80c40c0428ac75e9
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:26:48.162Z'
    finished_at: '2026-08-24T06:27:01.732Z'
    artifact_digest: 58db1bd8fe69c252e150254463fe570e7629d769e0f2939e09b630745327c5dc
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13570
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3da9a117f0b85bf3d1ad7ae2
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:54:59.086Z'
    finished_at: '2026-08-24T06:55:12.384Z'
    artifact_digest: 3fe5b8c850d5526d299ffacbb828e6af3f44cfd1f2bc549248c99841b14e4c14
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13298
  - version: kibi.verification-receipt.v2
    receipt_id: VR-073e049e1db0e23a5201369e
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:24:56.242Z'
    finished_at: '2026-08-24T07:25:08.636Z'
    artifact_digest: 6041e649673bcc7a44dd741a47208cec75c1852afcdcebd8f1b0c20b733cc73e
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12394
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f91cf6bee456c69f7a2ba96f
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:49:35.288Z'
    finished_at: '2026-08-24T07:49:47.775Z'
    artifact_digest: 8bbe8a675bcf1260798b0dd366f318bf2bb1ae9f0c19a25b96ea782e3cdbacbf
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12487
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e952dc49c1a0d1fdbbcde483
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:21:57.238Z'
    finished_at: '2026-08-24T08:22:10.401Z'
    artifact_digest: 9de9ee895dd0de29e26f3b02121a7ded739739cba5831b85337780529c15d5fc
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13163
  - version: kibi.verification-receipt.v2
    receipt_id: VR-87286c72c072a77fe0c8c580
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:51:49.706Z'
    finished_at: '2026-08-24T08:52:02.539Z'
    artifact_digest: 2b0bec15763b87ff4d6e3a00c8bca5d4b23961fe618614da2249d90c60871514
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12833
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7bc9442da371de55020568cc
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:54:58.383Z'
    finished_at: '2026-08-25T20:55:12.677Z'
    artifact_digest: 9ba394d720b7c7191a6e2a4d40e644b41e2f914a4b47fe488435539bd52dfb48
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14294
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f565b16c88cf951c3282acb6
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:42:09.582Z'
    finished_at: '2026-08-25T21:43:16.383Z'
    artifact_digest: 1b99693df002facd964850f94a6d539a644c7e0c4f68beedc21d1cde85bf1768
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 66801
  - version: kibi.verification-receipt.v2
    receipt_id: VR-56b3ae63028c8b6a41f124f6
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:27:12.969Z'
    finished_at: '2026-08-26T08:28:02.115Z'
    artifact_digest: 84b2f6cc7bced7b75e8667860a180a3b108fdec64fbf547a5926fd3db187a7e9
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49146
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f2988cfd7781e833326527de
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:44:41.530Z'
    finished_at: '2026-08-26T13:45:49.146Z'
    artifact_digest: 46467e3d61af998e8f0cbfbdd410c0cee31573baeb741c299fd90dce10d3950c
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67616
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dac27567cf246fb7ba82bca3
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:36:38.251Z'
    finished_at: '2026-08-26T15:37:53.095Z'
    artifact_digest: be33ac4f8385990a01abf5dd2c98d8f8969baa24d75230899248c5b98c6cc372
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74844
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e2fcf850925cbdb7ba04a8fd
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:37:24.777Z'
    finished_at: '2026-08-26T16:38:45.300Z'
    artifact_digest: 6a46310487cb6d4cec509b9ee2453fc0066141404f58ec6cf732426e70b60de7
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 80523
  - version: kibi.verification-receipt.v2
    receipt_id: VR-384aa3c8183a1202aab20898
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:25:23.674Z'
    finished_at: '2026-08-28T10:26:29.935Z'
    artifact_digest: 9891cb953267b7f85e7fca1d282dc831e246107df73f538b289f633ef9df051b
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 66261
  - version: kibi.verification-receipt.v2
    receipt_id: VR-59ec34a4f7b5942e1a78a1f9
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:32:31.122Z'
    finished_at: '2026-08-28T13:33:44.512Z'
    artifact_digest: 1afd4ae62f159396eba853d639997546702b0db608deeb0b710b1d7d60d7efd6
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 73390
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3489c515762d5e8bf3f597d3
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:16:34.396Z'
    finished_at: '2026-08-29T01:17:39.265Z'
    artifact_digest: 7c37b6c4a85b7d8d6f891c1648e220d4a1f1398d1170600453724d4baabc6047
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 64869
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bcd3a3628fa901f6edcd7ada
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:38:00.894Z'
    finished_at: '2026-08-29T07:38:41.996Z'
    artifact_digest: 601e79f3394ccee8895b9a0e5a8cbc5b8b27ee0b05429fd6b9edc758c069ddcc
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41102
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f1ad694317d8a44358aa5880
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:07:08.463Z'
    finished_at: '2026-08-29T08:07:48.531Z'
    artifact_digest: 35d95b73752d22db8fb1c01a779b3216ad3c43e9ebbefdccc4ac462729884570
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40068
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d8a119c83395fec10b60bf24
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:38:45.080Z'
    finished_at: '2026-08-29T08:39:25.106Z'
    artifact_digest: f63f3de919cfd04eb4736dd9659146d3d04d95162d89c1adc7622622c382e3bb
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40026
  - version: kibi.verification-receipt.v2
    receipt_id: VR-275c8df74add8cc2b3a06c9a
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:27:54.933Z'
    finished_at: '2026-08-29T09:28:35.724Z'
    artifact_digest: fc868e1af8df29af72dbbe7d0ebabd73a271cf882c7d76f04cb51e357883ef83
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40791
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4ee78285c8afe5652ef95b25
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:58:04.433Z'
    finished_at: '2026-08-29T09:58:46.280Z'
    artifact_digest: da57120a66cf7a4394da07d0e3df1b0c17901bb80201d3f7b60c6e6aa98d3810
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41847
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f464e3a9291f6e7a101ffc73
    test_id: TEST-kibi-html-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-html-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:37:41.985Z'
    finished_at: '2026-08-29T10:38:23.455Z'
    artifact_digest: b940a9b2a187d862473644ee015e9c60fca9fa8de938de46c130bd671f6e6c74
    contract_hash: cfe77abad85887a678c3099429d6be62b67c18376db7745303c2924e0d1362fc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41470
---
Covers the pure HTML renderer, command output and browser-launch sequencing, pagination safety, HTML escaping, and a packed consumer workflow that generates the report through the installed CLI.