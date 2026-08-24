---
title: OpenCode bootstrap path behavior for canonical .kb/ layout
status: active
tags:
  - opencode
  - kibi
  - test
  - e2e
  - bootstrap
verification_scope: end_to_end
id: TEST-opencode-bootstrap-paths
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-opencode-bootstrap-paths
  required_case_symbols:
    - SYM-test-opencode-bootstrap-paths
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8d53d0c0f8766df932bed648
    test_id: TEST-opencode-bootstrap-paths
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-opencode-bootstrap-paths
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-opencode-bootstrap-paths
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:15:42.760Z'
    finished_at: '2026-08-24T07:16:08.102Z'
    artifact_digest: 33f6bc195f9516d8fc153c579c24b298a9682d1ed8b18e698eab6f9622f25504
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 25342
  - version: kibi.verification-receipt.v2
    receipt_id: VR-17c99c604bc6374d87bdcb52
    test_id: TEST-opencode-bootstrap-paths
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-opencode-bootstrap-paths
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-opencode-bootstrap-paths
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:12:43.012Z'
    finished_at: '2026-08-24T08:13:14.712Z'
    artifact_digest: 48523aa07530ac0ce798530c52940adeaffbef7645f4e707c3f729162f4b60b6
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31700
  - version: kibi.verification-receipt.v2
    receipt_id: VR-78c0cd0e0e01e8b5b5f5a2aa
    test_id: TEST-opencode-bootstrap-paths
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-opencode-bootstrap-paths
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-opencode-bootstrap-paths
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:44:24.013Z'
    finished_at: '2026-08-24T08:44:53.615Z'
    artifact_digest: 492d05b617b3b96a875d225d43e83310f023260aa5b0afbc0e22bd325045ff70
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 29602
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7db1024fa8a59070d2dc0e0c
    test_id: TEST-opencode-bootstrap-paths
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-opencode-bootstrap-paths
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-opencode-bootstrap-paths
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:14:31.244Z'
    finished_at: '2026-08-24T09:14:59.337Z'
    artifact_digest: 51cfa1516ad9920bb6be0f32297408023636e7b7e13ee7c3d2c61cf286ebf9e7
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28093
---
Verifies the packed kibi-opencode plugin's bootstrap path behavior against the canonical .kb/ layout through an isolated npm install of the real tarball.

Executable coverage: `documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts` — a healthy canonical .kb/ layout (all lanes plus manifest.json) must not emit a bootstrap warning, while a lifecycle manifest whose canonical targets are missing must nudge the agent toward `kibi init` and the canonical bootstrap flow.