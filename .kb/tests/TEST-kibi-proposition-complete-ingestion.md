---
id: TEST-kibi-proposition-complete-ingestion
title: Proposition-complete ingestion boundary tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts
tags:
  - requirements
  - semantic-inventory
  - cli
  - mcp
  - sync
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PROPOSITION-20260810-01
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/proposition-complete-ingestion.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:56:32.625Z'
    finished_at: '2026-08-10T15:56:59.485Z'
    artifact_digest: 605825cb536c48c4424e00af28978494cc02715fc49e1b0d21fedb11c8d5d0f8
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PROPOSITION-20260810-02
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/proposition-complete-ingestion.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:11:44.369Z'
    finished_at: '2026-08-10T16:12:12.341Z'
    artifact_digest: cb2d2d75bf0245becede4de525667fa64ccad9fc0fa2641e518f431d90aa9a3d
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8fe74a21adaf0e9b88d1de2f
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:14:45.080Z'
    finished_at: '2026-08-16T19:15:29.432Z'
    artifact_digest: 9759b78ff5e38abd4defaddedc30f731cbc3dec782d7d8cf83c72ec7394098c9
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44352
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b227bc5dd0ba6816163fceb0
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:23:49.753Z'
    finished_at: '2026-08-16T21:24:28.976Z'
    artifact_digest: 21c88f6aa36a3947700f6c0627e4b3dcbc1867e6db521acb264607bf0d0ecd6e
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39223
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e8604b0a2b59b7807d754eeb
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:49:29.327Z'
    finished_at: '2026-08-16T21:50:09.543Z'
    artifact_digest: 09a3e1511f7df42a3bb0c910bd11d00a06486fb8a577ba3b4a18a37785bde871
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40216
  - version: kibi.verification-receipt.v2
    receipt_id: VR-27c1533f3009f9a96c656e14
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:11:26.216Z'
    finished_at: '2026-08-17T12:12:02.726Z'
    artifact_digest: 557d6f52716c3840c75c585e23e8fc49988f343ffff960a6ef56570a5336e3d5
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36510
  - version: kibi.verification-receipt.v2
    receipt_id: VR-61dd56ce7d55b78be4caa0ac
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:03:46.226Z'
    finished_at: '2026-08-17T21:04:24.482Z'
    artifact_digest: badd6906c034b3ca70fe22deb3021b9fcc57707c60686abf1889a07de4a48d94
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38256
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7a316227eca6c2ab7826ce02
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:18:26.012Z'
    finished_at: '2026-08-18T07:19:06.468Z'
    artifact_digest: a0fc974bbdebcaf1a7701706a5467256e52bc8ff87f43811a40768e8da38066d
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40456
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f3512dfbb7170af8f68f6ee6
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:46:05.802Z'
    finished_at: '2026-08-18T10:46:46.842Z'
    artifact_digest: 27606dbc87e360da3dfa8f87139790948ce52df9267c30fdce79c915677dd6f0
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41040
  - version: kibi.verification-receipt.v2
    receipt_id: VR-98c6c35db057ef26a88038de
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:54:31.112Z'
    finished_at: '2026-08-21T21:54:41.054Z'
    artifact_digest: 753c4123504ec1edb3901c228f7f502723d316778edd516b77fde1550e954ea4
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9942
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a4f779f2e28db8cc272782b1
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:09:54.124Z'
    finished_at: '2026-08-21T22:10:03.275Z'
    artifact_digest: 4c11ac6afe0f29eb4f2efdaf396d4846dc18ffee7f46598da49298ab2b705849
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9151
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d597fb1859c00f19c8b6fbf6
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:00:58.914Z'
    finished_at: '2026-08-22T01:01:11.446Z'
    artifact_digest: ba116d28bdd57915d87dfd9c28d7bbc9ba07214915f08d68f404679e5823d9d4
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12532
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4d4ba5240237fd478575776d
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:02:21.795Z'
    finished_at: '2026-08-22T08:02:31.786Z'
    artifact_digest: b5438c9a80dd9f064e0edbf5f23dada9f92685944c25ef40059a7bec56ea37b0
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9991
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d9738ed3d4f0c924cf48a428
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:50:48.078Z'
    finished_at: '2026-08-22T09:50:57.050Z'
    artifact_digest: b9ab5ea6c28939cf46e44ffed41973f39f4ed230aef794cceea4b4895c34b238
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8972
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b6b10264b7467d4e3321310f
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:45:57.278Z'
    finished_at: '2026-08-22T12:46:04.804Z'
    artifact_digest: b06a70168905a810ef1fb28ee107cfc0ded20b8a16b75b69d92360bfc7ea9daa
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7526
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1c529f78553dd188d4e9c247
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:07:52.214Z'
    finished_at: '2026-08-22T21:08:00.620Z'
    artifact_digest: 3a0c58f08375019b9b1572f72de2c6de060a047f13996f57f0a54657eae5d6ee
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8406
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ac405293af772f964e82bd00
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:34:48.166Z'
    finished_at: '2026-08-22T21:34:57.966Z'
    artifact_digest: 656b5971de6460708bade817670e1525f3f4095424bf80c1a0b59f118f224acc
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9800
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c83490c2ba06f451ac978eed
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:04:39.583Z'
    finished_at: '2026-08-22T22:04:47.400Z'
    artifact_digest: a1b96eaf5d93da444257faf2e9fb0378430ad2a8730062db8b1aca7b82ecafb4
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7817
  - version: kibi.verification-receipt.v2
    receipt_id: VR-99bd5195c18f4354b65a2c97
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:34:42.586Z'
    finished_at: '2026-08-23T07:34:51.205Z'
    artifact_digest: 51f86f7d5f7913ae061f001ed9ef3f0d5d437fb46081f096d7bf81576b08928d
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8619
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0bc3b07abe932837b2caf3e1
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:18:14.419Z'
    finished_at: '2026-08-23T08:18:22.083Z'
    artifact_digest: 3ffb9f0c622ed67d54b5414c7ea748aadb2bf6fa3f1829d277046f582035ced2
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7664
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f0119517d81cde08bb9fc134
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:15:17.389Z'
    finished_at: '2026-08-23T12:15:25.238Z'
    artifact_digest: 6a31605a2f4b6c8fa053497cc1394c183d3fa80e016f35590173b1e6723df522
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7849
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4c4fc4e41bb330459724bb42
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:15:15.778Z'
    finished_at: '2026-08-23T19:15:23.468Z'
    artifact_digest: 7c071cf52c280817bd2911e90a328293521f472e9ded1afa44761a1678e7c1a4
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7690
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8bf4536806b371cc86df0aee
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:41:24.731Z'
    finished_at: '2026-08-23T19:41:32.535Z'
    artifact_digest: fc77da54add74513607b1a7a5fc289a7b541c7fe11a3ac3196f7bc7d32fa2d37
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7804
  - version: kibi.verification-receipt.v2
    receipt_id: VR-96c1aede08671ccaf64152b6
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:09:14.383Z'
    finished_at: '2026-08-23T20:09:21.871Z'
    artifact_digest: 750c864fbc0ef330c9d8487a3e5fa0157fe7633610ba170d6300a787dd98e049
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7488
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fcd08f1c9b5288627bd9f97b
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:35:32.709Z'
    finished_at: '2026-08-23T20:35:40.270Z'
    artifact_digest: 7d20a4ad18dae60bb1364676704ae84f73f29d8332e6ba5fe76c9c0938adb6dd
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7561
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3d2b1fba4b57cab1549922e0
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:16:17.625Z'
    finished_at: '2026-08-23T22:16:24.826Z'
    artifact_digest: 65b91c28c6a875312ad163890e7ace04c7c48ed6755234eba179308d2327f987
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7201
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5de321ee5aeacd4779e601b7
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:42:28.995Z'
    finished_at: '2026-08-23T22:42:36.298Z'
    artifact_digest: 4e4cce350eff5939b59cacc09d78af28273cde53714e4bb28825c3141c015bdd
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7303
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dd3d4f72404f591bb46317c5
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:28:20.080Z'
    finished_at: '2026-08-24T06:28:28.302Z'
    artifact_digest: 6b1f0c634dfbd44e9dceae3deee0605b8d15186952546dae147c562b51689572
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8222
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ae2af91b4a92616d9aa03610
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:56:28.695Z'
    finished_at: '2026-08-24T06:56:37.003Z'
    artifact_digest: bd3be60b8c3865fb4ed5433222ab10746065df961aa953abec6fa69892192732
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8308
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c25ca6fecd1fd177f5c02edb
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:26:19.028Z'
    finished_at: '2026-08-24T07:26:26.791Z'
    artifact_digest: e89054cfbe2d854b5b0cb04aa3b752d8107850e93306db1d54d894e759d6f3de
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7763
  - version: kibi.verification-receipt.v2
    receipt_id: VR-54698ea8b7368b21b114c130
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:51:03.644Z'
    finished_at: '2026-08-24T07:51:14.021Z'
    artifact_digest: 7cfcb5e993bd6bf285457cd12726c9e50037876d91618623c0428594cd8f7a4c
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10377
  - version: kibi.verification-receipt.v2
    receipt_id: VR-967ee42fac2383de46043a31
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:23:27.006Z'
    finished_at: '2026-08-24T08:23:34.838Z'
    artifact_digest: aed86dc2926dddc42731852b50eaa46aa4d284db7010c1f1b09f27e9f0e85da0
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7832
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e32aa77a1723fc733c8b2973
    test_id: TEST-kibi-proposition-complete-ingestion
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-proposition-complete-ingestion
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:53:27.837Z'
    finished_at: '2026-08-24T08:53:38.994Z'
    artifact_digest: fcc5f8231305e6be9978657c1a79296c9507ce7e22349ba90d9eb06af111f4f2
    contract_hash: 353c39ebe4b854eecf90f7f33da796e589fac9bf9cecf6a25aaad57fcbcc4d9a
    case_results:
      - symbol_id: SYM-test-packed-proposition-ingestion
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11157
links:
  - type: validates
    target: SCEN-kibi-proposition-complete-ingestion
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-proposition-complete-ingestion
  required_case_symbols:
    - SYM-test-packed-proposition-ingestion
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises the packed CLI from an isolated consumer installation. The suite proves direct preflight rejection, post-baseline Markdown rejection for a new incomplete requirement, and successful ingestion of the same prose when it carries the exact advisor-compatible version, source hash, claim key, role, status, and UTF-8 span. Unit and parity suites additionally cover duplicate identities, explicit unresolved states, exact grounding claim keys, modeling-plan completeness, and schema preservation.
