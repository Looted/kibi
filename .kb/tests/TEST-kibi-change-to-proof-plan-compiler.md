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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2109ee125ac86c53d7432b00
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
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:00:29.646Z'
    finished_at: '2026-08-22T13:01:16.958Z'
    artifact_digest: 75b1f7ea29fd832396c08d6c3cdf7992f0dce205fcfcddca49d4f02cfcf2dfb7
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47312
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6230288bdda6f04daeb4891b
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
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:44:33.922Z'
    finished_at: '2026-08-22T21:45:21.371Z'
    artifact_digest: 930485c3fc93f223be8676e5c2f76c7502985aaf948dc9d4ecfd8e83d9e804dc
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47449
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f95b55b1ba58f03c048cd1bc
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
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:50:06.583Z'
    finished_at: '2026-08-22T21:50:53.882Z'
    artifact_digest: a4796deb851a339d4ea8fac0e10916b90e10cd753a7d044daedd3ebefffccd57
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47299
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c4d7f7e92c400651c4cf8dc8
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
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:18:54.293Z'
    finished_at: '2026-08-22T22:19:40.347Z'
    artifact_digest: 05f4e9186942d22360af1094fe0cc2f4d743577c0704e65ffd9835580f67ea95
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46054
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3b36afd2d03d20e65d11d0c8
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
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:49:41.489Z'
    finished_at: '2026-08-23T07:50:42.084Z'
    artifact_digest: b57337591ed58e6be0faed3e1154454277830b18f7a3b9763f2dabc76d221377
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 60595
  - version: kibi.verification-receipt.v2
    receipt_id: VR-feafb0e8b5836e8bbfdf826a
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
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:33:02.309Z'
    finished_at: '2026-08-23T08:33:50.720Z'
    artifact_digest: 8c8f3f1b39cb8d20c0b404e5f4b1c25ba9c9d27565558b9ec90d73fd8a1fb4de
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48411
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a9682be09925cf64cbbec973
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:29:40.853Z'
    finished_at: '2026-08-23T12:30:28.722Z'
    artifact_digest: 828d1c57bc50a9b829dbb0f30809ad0ddd6ff5cfaa38843207512e017f9cc783
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47869
  - version: kibi.verification-receipt.v2
    receipt_id: VR-89efcbd0cf58181c9336f596
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:29:57.429Z'
    finished_at: '2026-08-23T19:30:45.398Z'
    artifact_digest: 73f38b6d1db1f9d1427bd6ca42959a450f8294cf7fc0be756815fbd4ebb120ca
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47969
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bd3b96f81d04c623d5816143
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:56:10.241Z'
    finished_at: '2026-08-23T19:56:57.734Z'
    artifact_digest: 45ba8c20e9c0d83c9f0f9a70a37f2f4a3c4a8ed08eec411466391c2979adf9f5
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47493
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8d994d057c5e866484d8bd44
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:23:39.086Z'
    finished_at: '2026-08-23T20:24:25.597Z'
    artifact_digest: 1a0140bde8dee0958724fb3ee1fbf86bd9d9dd728e20d79e2843319bea56f355
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46511
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4848b4843a2df8361a273c63
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:49:47.795Z'
    finished_at: '2026-08-23T20:50:32.975Z'
    artifact_digest: 9dcdad6087396a62a2c17274c863b01480558445acb0f792439fa3ff515581ba
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45180
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fd8614871c13f521f4131192
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:30:14.191Z'
    finished_at: '2026-08-23T22:30:58.795Z'
    artifact_digest: c6c1e7d8dbe36438ddc2f026d7d9e6b042ed49245719d6ef5ba092b682b6f899
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44604
  - version: kibi.verification-receipt.v2
    receipt_id: VR-41415fc42f6abe3f81736097
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:56:32.944Z'
    finished_at: '2026-08-23T22:57:18.663Z'
    artifact_digest: 0d5a1eb3fa0f10f87168bafd57ca6c154db60f9f55f87aff4c2a438fad0e2458
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45719
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fa850efd49fc087f44e6345d
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:44:28.112Z'
    finished_at: '2026-08-24T06:45:21.312Z'
    artifact_digest: 86b9cad23c347055e6b3275b883b89c4bccd1f6311edb01f966242ac9cf2dfd2
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53200
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5054a408a6cb87cb02038dd5
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:11:44.692Z'
    finished_at: '2026-08-24T07:12:34.445Z'
    artifact_digest: 79239a13f10f94ae82aa4722461d5d855fc7c19983ca8dc9c045254c88dbb5cb
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49753
  - version: kibi.verification-receipt.v2
    receipt_id: VR-42cf66cbda7f7f77116d82ac
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:42:15.735Z'
    finished_at: '2026-08-24T07:43:05.177Z'
    artifact_digest: b2245860f9946e6ff5dd3edc44849ca47d9d6b726da1904026e7a7b52da21e5a
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: failed
        retries: 0
        duration_ms: 49442
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6eabae278ca9c9b8e9dc971a
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:07:30.270Z'
    finished_at: '2026-08-24T08:08:30.966Z'
    artifact_digest: 9645c4b8d04cb5364d92f9afd2fcdfd9648dfd73cc7e8b261641589678b20cbc
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 60696
  - version: kibi.verification-receipt.v2
    receipt_id: VR-61f5e9328e28abc0e30199b6
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:40:03.539Z'
    finished_at: '2026-08-24T08:40:56.638Z'
    artifact_digest: 45c93d2d5985c9ec850a32d4a9dbd1345ae5784b2ffac5b8522cd2bdb6b6ca8c
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53099
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0ba539ced76c6bd18ccdb2ab
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:10:09.042Z'
    finished_at: '2026-08-24T09:10:59.574Z'
    artifact_digest: 8f827afd75e607416d5dd43bc6ee213c64f87d7a50323b2a98d483f3b7dfc9fe
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 50532
  - version: kibi.verification-receipt.v2
    receipt_id: VR-173fc6042d8a91464f3e8afb
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:21:49.388Z'
    finished_at: '2026-08-25T21:22:37.387Z'
    artifact_digest: 7e1e46ab23eb876f13fcd4909cda88aa42882a6abad84a3b6b6b70259e30e392
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47999
  - version: kibi.verification-receipt.v2
    receipt_id: VR-032302c8bcef02db6afa8188
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:06:10.685Z'
    finished_at: '2026-08-25T22:07:52.780Z'
    artifact_digest: d47da78673fe2b84d7b62c53e87883198830dd2270ef01563e1477fa50511bf2
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 102095
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6580a1be7829d6eddc6a3118
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
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:09:27.624Z'
    finished_at: '2026-08-26T14:11:11.445Z'
    artifact_digest: cdedbcae9db45442c27da1b5156bab0a228afb6b34bc1bccdb296cd394c87842
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 103821
  - version: kibi.verification-receipt.v2
    receipt_id: VR-196516653bd1bd07c878769e
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
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:02:18.455Z'
    finished_at: '2026-08-26T16:04:05.433Z'
    artifact_digest: 7f14824dfe5886df40ce70bafcf987fae189ad23d13a0858921c43f6e02913cb
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 106978
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5d8468ade6384be253af31e5
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
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:03:41.390Z'
    finished_at: '2026-08-26T17:05:36.010Z'
    artifact_digest: eefb215ddb6b392ad1ceb5a7971ba19e1565bac835668fe14a6a4e0d0e081636
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 114620
  - version: kibi.verification-receipt.v2
    receipt_id: VR-71525034f278cfebde638b0d
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
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:08:08.761Z'
    finished_at: '2026-08-28T13:09:39.365Z'
    artifact_digest: b8c2e411fd018df5f97169fabe697ee306b494c56a2d96154b026bf0ef113bb7
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 90604
  - version: kibi.verification-receipt.v2
    receipt_id: VR-042f71d71d5b8473f7449dfc
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
    code_snapshot: 2a9a4a2399988f15d636abf26dce96e72aeb3afa439e03a5fcb39b9a984fdfff
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T14:01:30.443Z'
    finished_at: '2026-08-28T14:03:12.544Z'
    artifact_digest: b010b60054cbae5b12d8eb038bd57e9418c3407675fff1a846e7c14e7f13b442
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 102101
---

Operation tests verify deterministic plan hashes, one disposition per assertive clause, contradiction and ontology-gap abstentions, dependency ordering, sequential apply behavior, and rejection of stale plan hashes. MCP and CLI fixtures assert the same planning and mutation contracts.
