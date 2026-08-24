---
title: Fresh snapshot-bound verification receipt tests
status: passing
tags:
  - requirements
  - proof
  - verification
  - receipts
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260810-01
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:57:07.796Z'
    finished_at: '2026-08-10T15:57:42.693Z'
    artifact_digest: d931889ce55c62bb94c3084d7c78d7a026a691d46b426a0b5338ac4391781d01
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260810-02
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:12:21.775Z'
    finished_at: '2026-08-10T16:12:57.750Z'
    artifact_digest: 7204825a77b043f8acd29b3cd75a30138774434330c14676e367330ebb73a8ae
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260815-01
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: NODE_OPTIONS=--enable-source-maps node scripts/run-packed-e2e.mjs /tmp/kibi-e2e-packed-compiled /tmp/kibi-e2e-packed-compiled/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 24b9085cc16fe3dc9c05054b96502f6622fef2ff5f242ffe69dee60c5f8847c7
    environment_hash: 934b23384d944f5b0bf0c8e10597c5bfc62fcc5a250775cdce150309d1cbba47
    started_at: '2026-08-15T12:41:06.000Z'
    finished_at: '2026-08-15T12:41:36.000Z'
    artifact_digest: 5e81d6366fe11dd787579d0e63fac306f529d59c4dc357164d9bcd299d4ed51f
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260815-02
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: NODE_OPTIONS=--enable-source-maps node scripts/run-packed-e2e.mjs /tmp/kibi-e2e-packed-compiled /tmp/kibi-e2e-packed-compiled/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: b503bd366de55a4fb89b68e0cfdf3b74c9ea1331a5474e9c569978d28ce0b149
    environment_hash: 5007d53012af539504995c6ad9a5b23a232fe9bda9ed308269d8518c49fd63ba
    started_at: '2026-08-15T12:44:36.000Z'
    finished_at: '2026-08-15T12:44:36.000Z'
    artifact_digest: 036dfdea0d579a7cb0c4a570a54c84bcf5f31a7b7c62b4b7011188db908d03e2
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-RECEIPTS-20260815-03
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: NODE_OPTIONS=--enable-source-maps node scripts/run-packed-e2e.mjs /tmp/kibi-e2e-packed-compiled /tmp/kibi-e2e-packed-compiled/fresh-verification-receipts.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 7bc5e6f0b7faa554cddf9bbd4bb36f7af8e395ad2a567fa9f429d62e7d4947c0
    environment_hash: 56cf31308dfd4e2f56aefe3fd57d7a40e62b8d54cd45e2e338f746a6f5143220
    started_at: '2026-08-15T12:56:55.000Z'
    finished_at: '2026-08-15T12:56:55.000Z'
    artifact_digest: 47771f7ec19a76b9d3e85b94b072d0cda1c9e79d8e7473b3f4ded4a3600ffd67
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d35378e5b849855d3de17617
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:02:38.780Z'
    finished_at: '2026-08-16T19:03:30.196Z'
    artifact_digest: dca36e5381468ea7a31143a95d89c1e98d39d9ccf0c0b3921ae4e6842a4347a7
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 51416
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b6b491a5611c163e43b7d074
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:21:28.150Z'
    finished_at: '2026-08-16T21:22:10.764Z'
    artifact_digest: e57764823066262e5e1b2b7f7b46432090d2245781f4f978413bd6410767e8a3
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42614
  - version: kibi.verification-receipt.v2
    receipt_id: VR-600bf4812a5a722ae7f85e05
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:47:04.044Z'
    finished_at: '2026-08-16T21:47:47.636Z'
    artifact_digest: a495209ec9a065dce2b3797878e023cbf05edc618c2090ad152e7bd288eabd7d
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43592
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bae3fc0b71b9f06cfeef5f80
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:09:14.065Z'
    finished_at: '2026-08-17T12:09:54.113Z'
    artifact_digest: 66c2d2c346ff94d1a558b2a49e06f488ec5239dba5cd6a5aed0cd385a02a5607
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40048
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0ef81b368dbf5c63bc1e74c5
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:59:41.934Z'
    finished_at: '2026-08-17T21:00:23.610Z'
    artifact_digest: 67abfd229ce8676fa0470e3804340de39d1f60c531e2174b857b9b04d0593a97
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41676
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2c4f03f1db3cc6f67be447e0
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:14:02.798Z'
    finished_at: '2026-08-18T07:14:49.729Z'
    artifact_digest: 617baa722d63759ee9853379cfb2bae7b67f9927b5e5a2a371bb1a9fa49eccc7
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46931
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c1d74a2b22e79cdd4c8e8c12
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:42:40.287Z'
    finished_at: '2026-08-18T10:43:25.090Z'
    artifact_digest: 4cba1eb6c3e737a09e52bc69e4ff3971a0edfa193d8ec3925f4a3523fb62e543
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44803
  - version: kibi.verification-receipt.v2
    receipt_id: VR-645f808a27d658353f48fe18
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:52:25.212Z'
    finished_at: '2026-08-21T21:52:40.927Z'
    artifact_digest: d313cb33ad26cd854e5a525bb5b2b0e06819d9694ac999c861a20f3fc6c6cf15
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15715
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7b63d3646b85ed4d3b25f570
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:07:50.148Z'
    finished_at: '2026-08-21T22:08:04.678Z'
    artifact_digest: 82f67f9ca28d44324b5e0e888ca1ce15cd915fdc43e59b545dfb475c129ee7d9
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14530
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ef9c2434298e956e4e4974ed
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:58:15.635Z'
    finished_at: '2026-08-22T00:58:36.264Z'
    artifact_digest: 4cde039ddcef70f34f0f5640dd69d9e796bea00cfc6dd8e8aa3fba7be394e3be
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20629
  - version: kibi.verification-receipt.v2
    receipt_id: VR-26314261cce15a7e1fcc3303
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:00:12.950Z'
    finished_at: '2026-08-22T08:00:28.039Z'
    artifact_digest: 955e2894cee677996a5d65ff5d26c8cfc436b83ab8879f8a83d28a83bca6c7a3
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15089
  - version: kibi.verification-receipt.v2
    receipt_id: VR-966b3c2e021832007a2aab03
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:48:20.907Z'
    finished_at: '2026-08-22T09:48:34.615Z'
    artifact_digest: 6c64b9f66c865e61a8288dbbe30c3bde08d6140c1fbd616bdd901a4b31b02c8b
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13708
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c883b2ab7dc9a8d4764225ee
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:44:19.671Z'
    finished_at: '2026-08-22T12:44:32.131Z'
    artifact_digest: 9f89dcc5e4ec482643e3d1b194b940f62dc48107082f32992a2883656a0a73db
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12460
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4ebb17fd1845da591c26d3fd
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:06:09.744Z'
    finished_at: '2026-08-22T21:06:22.493Z'
    artifact_digest: 473e31eecf0967add36ff74feb7482ea172c0e0afe1964e2e19caa6369d258a1
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12749
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e43b51663de1dd3e35a18990
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:32:54.317Z'
    finished_at: '2026-08-22T21:33:08.942Z'
    artifact_digest: d3ce45250f068149a6b927b5a915fffb06ba8c262f50b11ce0e2d034d9a6058f
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14625
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d2c689155a528a5eac9efdd8
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:03:03.006Z'
    finished_at: '2026-08-22T22:03:15.315Z'
    artifact_digest: e3b9684758e5fcdedfa8a195074e49aae7f51cfb74592232bc593b647bc1fdc0
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12309
  - version: kibi.verification-receipt.v2
    receipt_id: VR-16c1b682c5bfc68903404e00
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:32:57.576Z'
    finished_at: '2026-08-23T07:33:10.416Z'
    artifact_digest: edc051f8adf8e8f1963891397efae91599492e2ac8343188298711115833d09b
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12840
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b871c4e2c67ef11adf5dc3c4
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:16:36.998Z'
    finished_at: '2026-08-23T08:16:48.746Z'
    artifact_digest: 699971ec9552c40e11094b1f1bb8aaab860e6a323b408191bbd83b888de40cd2
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11748
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0650646a9728f86103e995b1
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:13:43.270Z'
    finished_at: '2026-08-23T12:13:54.630Z'
    artifact_digest: 96358b8bd5671d5dde2f8af5aafddb9c4f3af0678efd3201dab5a203d667ef2f
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11360
  - version: kibi.verification-receipt.v2
    receipt_id: VR-92da94ae748d46ee554ef365
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:13:34.432Z'
    finished_at: '2026-08-23T19:13:46.757Z'
    artifact_digest: 475f4b969694c33c23f5e8b7de5a052837b77c8f68247ca2e8673f60e7a31220
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12325
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1bbffa0f73719bcdf423b56c
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:39:44.735Z'
    finished_at: '2026-08-23T19:39:57.051Z'
    artifact_digest: 700f9c0ae6b581e8675d214f26c84b3d53978ebb74a42ac8494f2f28d9308d3b
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12316
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ec6c263e44b87479aeb17326
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:07:38.710Z'
    finished_at: '2026-08-23T20:07:50.564Z'
    artifact_digest: 5ca2d204406f4bb6add6bc0744a3b806bc0bd1069d4620b97783b573b5a164cc
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11854
  - version: kibi.verification-receipt.v2
    receipt_id: VR-89a228884b120dd334522939
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:33:56.346Z'
    finished_at: '2026-08-23T20:34:07.967Z'
    artifact_digest: c46d97af600adedb0eeaeefc6066306c909c173a2974f220c3637a10f625272b
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11621
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8b9c08f4aabb5ccc44813483
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:14:45.575Z'
    finished_at: '2026-08-23T22:14:56.681Z'
    artifact_digest: 01a704d8dc570efa040e16aca8dad6b2f856cb389e4aaeff90226ec5d3f8dfdd
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11106
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c39a9d2c446b9a737de7341a
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:40:56.318Z'
    finished_at: '2026-08-23T22:41:07.830Z'
    artifact_digest: 9fe5b0662eb698e5a7b54f67f36910ddebd98a0abf7cc2f735e6a4bf943fcb41
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11512
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4beeded46fe692d0a99e7444
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:26:30.416Z'
    finished_at: '2026-08-24T06:26:42.681Z'
    artifact_digest: 6375bccf265d883110b6e735bc5fd573ff1bc7d703389a55e75a0d277179abdc
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12265
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9a1da3dcaa959fc48055f3f7
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:54:38.092Z'
    finished_at: '2026-08-24T06:54:51.442Z'
    artifact_digest: c76cd843601ab97a664466304c077cfadfb7cc4efdee70c58cbdc01a93be6f6d
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13350
  - version: kibi.verification-receipt.v2
    receipt_id: VR-092270dc0279a82738701755
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:24:37.933Z'
    finished_at: '2026-08-24T07:24:50.356Z'
    artifact_digest: 0f8f8b867a6e875b5441f083f4590980a844ac594753ef52879c8a6ab3372579
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12423
  - version: kibi.verification-receipt.v2
    receipt_id: VR-614a80da4dadce86bde7a2d8
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:49:16.819Z'
    finished_at: '2026-08-24T07:49:29.264Z'
    artifact_digest: 1f42027ee33c82d903a28a75b5c403a51c24a4eb123d0e5c6d416752ebd02a5f
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12445
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f2adc06547762679e262e2e0
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:21:37.896Z'
    finished_at: '2026-08-24T08:21:50.341Z'
    artifact_digest: a4f55aac149b7408553ca68983a804be6fec56c555ac09c4cc719278561df9f1
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12445
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc07069a426547bd1c0d30bc
    test_id: TEST-kibi-fresh-verification-receipts
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-fresh-verification-receipts
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:51:31.314Z'
    finished_at: '2026-08-24T08:51:43.445Z'
    artifact_digest: 1fc6a3277c5a80b7d1c3025252de07acd8c80df6a7eb3368e16adec472f62230
    contract_hash: ba7a57dd4bc9730259c37651822020009939343e59aa4a3496c80e2baf4f423d
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12131
id: TEST-kibi-fresh-verification-receipts
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-fresh-verification-receipts
  required_case_symbols:
    - SYM-test-packed-fresh-verification-receipts
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
---

Verifies receipt schema and history validation, append-only mutation and sync behavior, deterministic workspace snapshots, Prolog proof-state classification, durable-status non-authority, and CLI/MCP reporting parity.
