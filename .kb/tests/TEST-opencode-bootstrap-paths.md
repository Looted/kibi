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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8538bb99ac13ceae287d0e73
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:25:35.798Z'
    finished_at: '2026-08-25T21:26:02.132Z'
    artifact_digest: 5b5848edd81f35a07bfb9fff8023029c68590d5cee216fb3ec6f58e36f61ba95
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 26334
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a980932029c77eb577471fcc
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:16:15.783Z'
    finished_at: '2026-08-25T22:17:51.069Z'
    artifact_digest: 5805a68d03f129a7efb34d923d67f41ec34dc74bcf58b91f232588a2e0873491
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 95286
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f0c2e4eb0a9c08a3fb75882a
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
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:19:24.364Z'
    finished_at: '2026-08-26T14:20:35.197Z'
    artifact_digest: 2e90ffc76fe5bfe7bcf27088697fcf9112924e8029a86f90f829b1970361c9f7
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70833
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a39c58a6fed5d2ded6b8db63
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
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:36:38.667Z'
    finished_at: '2026-08-28T10:37:57.394Z'
    artifact_digest: a41ebce3e190a52669685e4bc982e319eaf0366948bac0e3d76de7c621790339
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78727
  - version: kibi.verification-receipt.v2
    receipt_id: VR-09087840b28c3a9d3a9ef336
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
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:43:10.219Z'
    finished_at: '2026-08-28T13:44:29.281Z'
    artifact_digest: a913084bcfaa6b6f1297172b8daa811cfe02075ee2a6d4b20e54cb7e0218483d
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79062
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4222dbe6c80406c70965a0bc
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
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:26:57.172Z'
    finished_at: '2026-08-29T01:28:08.703Z'
    artifact_digest: 47f473f462faaf9b87320aeb281ee227d2e0977a72ffb678f12a4808f8cd4f01
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71531
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c5c13ebbb48d307c2bc9e9d9
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:43:52.945Z'
    finished_at: '2026-08-29T07:44:42.117Z'
    artifact_digest: b7687050c384e9f2f0f8cb3598e49a71d6389e4a3c0621976552cee33758cf94
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49172
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e8cd7940f6657ae8f3704983
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
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:13:53.429Z'
    finished_at: '2026-08-29T08:14:38.155Z'
    artifact_digest: c73803a15e7d50abafd1bf87dfc728684e6cc06bd6cfb79c49a0ff79b0a84a42
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44726
  - version: kibi.verification-receipt.v2
    receipt_id: VR-60708594b0a79ef92c602657
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
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:45:20.257Z'
    finished_at: '2026-08-29T08:46:03.399Z'
    artifact_digest: 39690176ed3090ff722a27a86eeaafa4336f20c882e71bbc230ca9e341b144c0
    contract_hash: 5c674cf3569b0b2ed34b605c3049caa5a6235a948b8e9dd7bb77115a31f07ab5
    case_results:
      - symbol_id: SYM-test-opencode-bootstrap-paths
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43142
---
Verifies the packed kibi-opencode plugin's bootstrap path behavior against the canonical .kb/ layout through an isolated npm install of the real tarball.

Executable coverage: `documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts` — a healthy canonical .kb/ layout (all lanes plus manifest.json) must not emit a bootstrap warning, while a lifecycle manifest whose canonical targets are missing must nudge the agent toward `kibi init` and the canonical bootstrap flow.