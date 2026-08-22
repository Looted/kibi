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
---
Covers the pure HTML renderer, command output and browser-launch sequencing, pagination safety, HTML escaping, and a packed consumer workflow that generates the report through the installed CLI.