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
---
Covers the pure HTML renderer, command output and browser-launch sequencing, pagination safety, HTML escaping, and a packed consumer workflow that generates the report through the installed CLI.