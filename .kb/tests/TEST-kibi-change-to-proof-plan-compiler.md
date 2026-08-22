---
id: TEST-kibi-change-to-proof-plan-compiler
title: Change-to-proof plan compiler verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-plan-compiler.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - planning
  - requirements
  - contradiction
  - traceability
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-plan-compiler
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-change-to-proof-plan-compiler
  required_case_symbols:
    - SYM-test-kibi-change-to-proof-plan-compiler
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-30e4e0f885dc27249326eba9
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:44:14.504Z'
    finished_at: '2026-08-16T19:45:26.386Z'
    artifact_digest: ace549e57caf43fb9e22e9dfb74330924374c09284f7279c6d4e7768d29c38ba
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71882
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2661fe313a3c5289ff9e552b
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:06:48.656Z'
    finished_at: '2026-08-16T22:08:13.282Z'
    artifact_digest: e8f829773404538f26f9b8af1df752dfda4d53d3e6a6e98e7af9e5e1dce670df
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 84626
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0fb489930a9106ff83d9a518
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:26:57.099Z'
    finished_at: '2026-08-17T12:28:10.046Z'
    artifact_digest: db165fbb4d33d0b7ae557c1fa40c47e2cbd87924c5036009858f2d9cb52150f2
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 72947
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9a2507a8d7c26b8907ba0170
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:19:39.340Z'
    finished_at: '2026-08-17T21:20:55.659Z'
    artifact_digest: d21dacece33db9cb1452616ad7c573909c1bb65960e0690e96f08b0c6750151d
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76319
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ac419947ff75a9e9576a6e1e
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:35:17.970Z'
    finished_at: '2026-08-18T07:36:37.365Z'
    artifact_digest: 6a966fd9915e551954e5cd440e27dd3a357e7ed926303849a6e8abdfd2ddfafb
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79395
  - version: kibi.verification-receipt.v2
    receipt_id: VR-11bddff89d04ca9d60990089
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T11:01:28.789Z'
    finished_at: '2026-08-18T11:02:48.783Z'
    artifact_digest: c0c7c9c7213e478ec1ed28a8e8b948c84e88a9c24715aec4041cc6806e85f42f
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79994
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e18edaf084b2f9c675ece66a
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: failed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:58:11.980Z'
    finished_at: '2026-08-21T22:59:11.315Z'
    artifact_digest: 315fab14adf25e72942b73db632d09e62aa175f5cde26ab4f14e3379d39e55f2
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: failed
        retries: 0
        duration_ms: 59335
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c0ddc32f647a958a443dcb06
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:20:33.508Z'
    finished_at: '2026-08-21T23:24:10.368Z'
    artifact_digest: 0d81b04e263cda7f35db46e480c0a102b0b8116ffee60f948de097a6ced4dbe3
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 216860
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bfff035c4d1a31ba5e3ce188
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:24:44.489Z'
    finished_at: '2026-08-22T07:04:15.068Z'
    artifact_digest: 94a2ad182878eed85201baa562e969cbf5b1d1ce40036ea83f55fcb729d8c1d5
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20370579
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5a5393ddedb1466ea12e1936
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: failed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:26:24.150Z'
    finished_at: '2026-08-22T08:27:44.533Z'
    artifact_digest: 1fa4b0abfad36851a4013e77d1d4e4bc84d98db1325d80ae7da1928a9bd18131
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: failed
        retries: 0
        duration_ms: 80383
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0790cb6a4489b11a81024908
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: failed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:53:52.092Z'
    finished_at: '2026-08-22T08:55:25.643Z'
    artifact_digest: 024d25146ca239cef3793cc318a0a089fa29d0609bd934e9d2599b5109460e4d
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: failed
        retries: 0
        duration_ms: 93551
  - version: kibi.verification-receipt.v2
    receipt_id: VR-569496f7d6d6d3ce7921c6cb
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:15:08.702Z'
    finished_at: '2026-08-22T09:17:17.233Z'
    artifact_digest: a56f2ce992e76af1f34fd3c614e581f547ec90a05c360c08cf01407adc8ca1bf
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 128531
  - version: kibi.verification-receipt.v2
    receipt_id: VR-117e82cbb0d9db50171ba736
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:06:50.477Z'
    finished_at: '2026-08-22T10:07:43.487Z'
    artifact_digest: 51cce11328ad64364679ab5995b998530391b877f13db00aaba107d23ede7372
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53010
---

Operation tests verify deterministic plan hashes, one disposition per assertive clause, contradiction and ontology-gap abstentions, dependency ordering, sequential apply behavior, and rejection of stale plan hashes. MCP and CLI fixtures assert the same planning and mutation contracts.
