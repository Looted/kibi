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
---
Covers the pure HTML renderer, command output and browser-launch sequencing, pagination safety, HTML escaping, and a packed consumer workflow that generates the report through the installed CLI.