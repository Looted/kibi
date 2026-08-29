---
title: Packed CLI GitHub report workflow and badge E2E
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
  - e2e
text_ref: documentation/tests/e2e/packed/github-report-integration.test.ts
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-github-report-e2e
  required_case_symbols:
    - SYM-e2e-packed-cli-github-report
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-github-report-e2e
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-00a2007dfb839a66ece2ceee
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T23:29:48.241Z'
    finished_at: '2026-08-21T23:29:57.578Z'
    artifact_digest: 73557e37a904ee93f7c601ab6b85c0bed7461a3f3a4651da9a0710815eeff8dc
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9337
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b77e884173a2d83d39fc31cf
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:04:52.798Z'
    finished_at: '2026-08-22T07:04:59.416Z'
    artifact_digest: b4237a759bb3f33b6c67f9ccc81bd2565e4d5467a01e690b21392a69c770b9cf
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6618
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e158843bcf75108800e865f0
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:24:25.900Z'
    finished_at: '2026-08-22T09:24:31.652Z'
    artifact_digest: 1de9b636d4ad05a525cc9c6bcfeaa3c2ccf9bf643948d1dcbb49e611c9ca8972
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5752
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7c54122f21b053d56f125dac
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:08:12.372Z'
    finished_at: '2026-08-22T10:08:17.628Z'
    artifact_digest: 7030a0d4eb5ca1698b62e2c7263c5786f7f91a775861ec7e8e44b03f374c16a9
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5256
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5938cd76c1b990daa8eeb4c2
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T13:01:43.288Z'
    finished_at: '2026-08-22T13:01:48.172Z'
    artifact_digest: 3ca094d154d074cccb7fd2728b1d56ed28a49f7e7cd37f1a5d81a1fd40f4268c
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4884
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0050a1af06ec4f32522016c3
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:45:47.735Z'
    finished_at: '2026-08-22T21:45:52.890Z'
    artifact_digest: 0871ab1cb036dd2ead1b0f5ddab70fcda9abec12d3c81fae74a04d43e8535208
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5155
  - version: kibi.verification-receipt.v2
    receipt_id: VR-57cecec00e39c4f0277b59fd
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:51:19.515Z'
    finished_at: '2026-08-22T21:51:24.489Z'
    artifact_digest: bf28dd07e27dd3cc014c7485667c3f0adb81c117acc43537fac36885e06bd8a0
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4974
  - version: kibi.verification-receipt.v2
    receipt_id: VR-60e7f84f4b62789132ce7e62
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:20:05.944Z'
    finished_at: '2026-08-22T22:20:10.910Z'
    artifact_digest: 136ec3ad3c3f8ae9df47bcf0d204019cac1be83a3d7924f2e8a45a6269a1a32d
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4966
  - version: kibi.verification-receipt.v2
    receipt_id: VR-905c829287f5af49fc9ab0b2
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:51:09.975Z'
    finished_at: '2026-08-23T07:51:15.322Z'
    artifact_digest: c51dfd74836235e50df6e553fe184f450528cbb272983f34c32f14b5881c2cb8
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5347
  - version: kibi.verification-receipt.v2
    receipt_id: VR-82ffe878f68f77d750630e48
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:34:23.546Z'
    finished_at: '2026-08-23T08:34:31.661Z'
    artifact_digest: 1fdfed05495bb963f7ce364f7172d9a3bb072bd5568c63af32bb8d2fb355681b
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8115
  - version: kibi.verification-receipt.v2
    receipt_id: VR-34be4bd22626440f6b035d6a
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:30:55.647Z'
    finished_at: '2026-08-23T12:31:00.548Z'
    artifact_digest: c615b3c3d09abe0cdf51e5a5cf5f16dbe83785916038ec9feebd600dbb45e3ca
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4901
  - version: kibi.verification-receipt.v2
    receipt_id: VR-82a8ea3aa59d132c4a5f1b40
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:31:12.688Z'
    finished_at: '2026-08-23T19:31:17.383Z'
    artifact_digest: 7c62f866cbc2090a6a78134a69c06fdd4f658d39011b83cf0a984f01016af814
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4695
  - version: kibi.verification-receipt.v2
    receipt_id: VR-96186e166a8df0079d1f6875
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:57:24.746Z'
    finished_at: '2026-08-23T19:57:29.504Z'
    artifact_digest: 184c1ccd1b3ae175b13f53f088114d86b1ab768677f10e628efe71b96a4124c4
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4758
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0009f7e63cd7431e7c1a0ba2
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:24:51.608Z'
    finished_at: '2026-08-23T20:24:56.282Z'
    artifact_digest: 45270944e11e1d7d773856cb115d287e5d41869f0d3f637e0d0fc7cb688b2e7b
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4674
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9f52a99d5a9da2a262422f4d
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:50:57.864Z'
    finished_at: '2026-08-23T20:51:02.445Z'
    artifact_digest: 9e860beedb39b12344aaf6190f523e6c4b914373304873b018c2e77eb526b0cd
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4581
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8c50fd66a1172ab4d363fea1
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:31:23.652Z'
    finished_at: '2026-08-23T22:31:28.092Z'
    artifact_digest: c5b37a77cbf0e27f768be0d72b1ac9b59cb85334528f4266dc4b9aa2e8205067
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4440
  - version: kibi.verification-receipt.v2
    receipt_id: VR-50897bb634ea677db0a20dcd
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:57:44.036Z'
    finished_at: '2026-08-23T22:57:48.535Z'
    artifact_digest: fed282fb6f6fefcfa06df251aa7f01dd3cb4ad90f90fb2a1458a04f12c75db12
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4499
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d9c9c9946f373539a6884862
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:45:49.589Z'
    finished_at: '2026-08-24T06:45:54.927Z'
    artifact_digest: 64b33dc286bc315022cec7244fd274e955dec1b4c932e4ef2ac742a9610409b6
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5338
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b1dab540e1f344ccfb42da05
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:13:02.733Z'
    finished_at: '2026-08-24T07:13:07.699Z'
    artifact_digest: cdc44c329230a204989dae4a14b66c79206448e07ff8e24f3c402783ab88373c
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4966
  - version: kibi.verification-receipt.v2
    receipt_id: VR-07878be2f48c54d0120abaef
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:09:04.163Z'
    finished_at: '2026-08-24T08:09:11.409Z'
    artifact_digest: d4dd3b699d4db4448961a1395cf6c5b4efdde09405eee9761d4ac64ae51247a2
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7246
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e105e960cc856c5a5b228c10
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:41:25.555Z'
    finished_at: '2026-08-24T08:41:30.739Z'
    artifact_digest: 33b0c3f6d5a24ca86f91ec0899f98d36f97ed66d39724d841a882cb897a7c7ce
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5184
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a6fadbfa52b9c299da84d02e
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T09:11:30.738Z'
    finished_at: '2026-08-24T09:11:36.097Z'
    artifact_digest: 5420eedf66fba690c0ad0191cfb4fc39df0da9c351be02e36a378e0173ad9c9f
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5359
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f714f73cccbf60e278ed9cb5
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:23:03.009Z'
    finished_at: '2026-08-25T21:23:07.878Z'
    artifact_digest: 8b2cd1159997d737faa14fa80be5bb2f4f02937bbd7af6f9d00b954c68b4b7d3
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 4869
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e6bf6ae35d7428817b9b0bc5
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T22:09:12.428Z'
    finished_at: '2026-08-25T22:10:15.640Z'
    artifact_digest: db03336b11e71f2e25a56b714292630a3eeeb522f1277ca2e19fbdd21664a0b4
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 63212
  - version: kibi.verification-receipt.v2
    receipt_id: VR-91bc2b342b57ed1d7975f515
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T14:12:31.614Z'
    finished_at: '2026-08-26T14:13:37.078Z'
    artifact_digest: 488bfb3806b81f9b9ad12d7b7aa8a77f0db94007c5abe147da52fe410ee16b29
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 65464
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e0340076cad7ce9edb38242c
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:05:28.108Z'
    finished_at: '2026-08-26T16:06:30.734Z'
    artifact_digest: 3da7f9eab6b0b5e0cd43af6ea66475c4c40d1ced05b5e35c9a85d2176dd79edc
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62626
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65ddcf5252c0925e3e746bbb
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T17:07:08.706Z'
    finished_at: '2026-08-26T17:08:10.841Z'
    artifact_digest: 25a9214b281d3c95805bbfec80e24f00b5ebe53dbcd5f6a934cd559ffdc2867c
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62135
  - version: kibi.verification-receipt.v2
    receipt_id: VR-aa0bc186bcc1a31cbeca0a67
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:39:14.353Z'
    finished_at: '2026-08-28T12:57:28.024Z'
    artifact_digest: 4e2d92fc7cd6589a34271c49c5a83ceabdaee8e7d648b489dbe97812bd482e63
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8293671
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9e2a2501a6098c4696a7396b
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:45:40.582Z'
    finished_at: '2026-08-28T13:46:38.704Z'
    artifact_digest: c620dad697dafb0f1b19793fcb9b551a9804de32444e1939fa2a4826260f832e
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 58122
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b3248352dfe9618f702cdf62
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:29:22.967Z'
    finished_at: '2026-08-29T01:30:20.373Z'
    artifact_digest: b470f59a2bb82465eeb4853567ac9be620ca51edf5cfc20c5a4f830d401c1b1e
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57406
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c01444cf482c8f015b782248
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:44:46.061Z'
    finished_at: '2026-08-29T07:45:20.547Z'
    artifact_digest: ba6c4630b49759697cd4a9cdbfd45ef1f45315c580b457a0b4f064b1c570a77b
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34486
  - version: kibi.verification-receipt.v2
    receipt_id: VR-39b65644f0eacc207e6dc768
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:14:42.037Z'
    finished_at: '2026-08-29T08:15:20.819Z'
    artifact_digest: 04f6b39768487e70b1d4b6c61615f1e0436e3fc0d14a76bc83e17d34b902f840
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38782
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cbc30a54b615dcccc5bf6cb0
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:46:09.050Z'
    finished_at: '2026-08-29T08:46:42.978Z'
    artifact_digest: f85bfe3c1476808391637eb4254e209abfb2a56f24bbedcb15f31aa3815e8ccb
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33928
  - version: kibi.verification-receipt.v2
    receipt_id: VR-62e31085fb6ddf146d7c482b
    test_id: TEST-kibi-github-report-e2e
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-github-report-e2e
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:35:09.963Z'
    finished_at: '2026-08-29T09:35:45.294Z'
    artifact_digest: 1ee2f3389637ff684cac705412af867672f7cabc67d4f830e760ff5f3ab596f8
    contract_hash: 5b7116040fb30890f2c87a63ffded85d91bdb989a4c89aaed02c2f78dd865fdc
    case_results:
      - symbol_id: SYM-e2e-packed-cli-github-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35331
---
