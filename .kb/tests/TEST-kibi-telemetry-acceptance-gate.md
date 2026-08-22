---
id: TEST-kibi-telemetry-acceptance-gate
title: Packed telemetry acceptance gate tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-telemetry-acceptance-gate.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-TELEMETRY-20260810-01
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/telemetry-acceptance-gate.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: af5a3d13df853075bfbcf1e13ce7c5765c54d6d15b23b0fbc20298ef593e8d00
    environment_hash: f4b357a726bb3da5c6af799453c3e30cecfa943779c803b59039dcfdb73a58b2
    started_at: '2026-08-10T19:09:20.218Z'
    finished_at: '2026-08-10T19:09:49.114Z'
    artifact_digest: 39945477ebe4020860aa85dd10345dfc3a335f82858df105730d1c4194a532b0
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-TELEMETRY-20260810-02
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/telemetry-acceptance-gate.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 618ad77e50f1f13da37d16e0b560b816f86e80ce1234a40e286f1d5dea43c6a5
    environment_hash: f4b357a726bb3da5c6af799453c3e30cecfa943779c803b59039dcfdb73a58b2
    started_at: '2026-08-10T19:41:00.083Z'
    finished_at: '2026-08-10T19:41:26.525Z'
    artifact_digest: 979bd481af2f083679b36fc2eaa7272fd49c7f95358a9d58dc692c6910b30fe7
  - version: kibi.verification-receipt.v2
    receipt_id: VR-658dc85746339052be727ecb
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:15:46.516Z'
    finished_at: '2026-08-16T19:16:28.683Z'
    artifact_digest: d9e1870c1476ad3e27ba1891c7d6cf93a3e5accf5d6a1e1c7895c57e8b2e279a
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42167
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a82663749bf54e66e879b1a7
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:24:36.132Z'
    finished_at: '2026-08-16T21:25:20.536Z'
    artifact_digest: 1ad02920f1abd6e812c1c65998837df2a5206be81a4e1fa70209734bad427a92
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44404
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3242f1566b4ad6e349b590cb
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:50:16.670Z'
    finished_at: '2026-08-16T21:50:55.900Z'
    artifact_digest: 095aad814e35d356ddbbb82de7ec8f5bafd2aa9ffa6f16f5405381982de317aa
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39230
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b3c1f8284b7865558e2fc0c8
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:12:07.180Z'
    finished_at: '2026-08-17T12:12:42.736Z'
    artifact_digest: 00869a7ddbe01da3a6836c52b64e36b0fcd65bb29358c4675edbfd7867785e69
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35556
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3a41c24a92a1e9c11311116b
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:04:29.121Z'
    finished_at: '2026-08-17T21:05:07.053Z'
    artifact_digest: c2722a6680a82b5c33d847b77f0722b21c1befed34f23382eceb9d7d64ffb895
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 37932
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1d43583438743caf9dc8c087
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:19:11.632Z'
    finished_at: '2026-08-18T07:19:51.286Z'
    artifact_digest: 72cf31b204bc8121c9bdaf19e839037e0d8167a727ccf612c045b2c61482588a
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39654
  - version: kibi.verification-receipt.v2
    receipt_id: VR-072aef7a9bc68b19acf631c9
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:46:52.156Z'
    finished_at: '2026-08-18T10:47:32.995Z'
    artifact_digest: 339a194d2e151d168ba8d0d95e2cdd0e923575628c1bdc2ecc2f42677025d1f2
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40839
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0dfec80349f949ebe2a66416
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:54:49.212Z'
    finished_at: '2026-08-21T21:54:57.348Z'
    artifact_digest: e38aca9f9a00b2a3a3bae5ccccdf5304e49edc05ac9d8f3c32db8c0287db107f
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8136
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7607fbc37ac12208439ee8fc
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:10:11.552Z'
    finished_at: '2026-08-21T22:10:19.700Z'
    artifact_digest: adab03ddcea6132b8d49bbead36d72348ccd06a4126f5faf1d4a19a6cbd3a6ec
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8148
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e3666b37643498219aec9f9f
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:01:21.878Z'
    finished_at: '2026-08-22T01:01:32.753Z'
    artifact_digest: 401298a6e5e4543415dfb74d2eab4626555c8ee90ea458cd1edde66b5f774eff
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10875
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b27057d4266b2d2817780f9f
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:02:40.222Z'
    finished_at: '2026-08-22T08:02:48.273Z'
    artifact_digest: 9b68eb9649877c85c9a23b202bb833ac6f78cd3ac4030fabb0fab27e2ddf51b7
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8051
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4e6b6467760ad158ec05f437
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:51:03.803Z'
    finished_at: '2026-08-22T09:51:10.969Z'
    artifact_digest: f6b8caaabadb780347a9a88dfdc1553e1373fc407cda51d6b8ebc99956c15b5f
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7166
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7cec535141a4920aad9e8df8
    test_id: TEST-kibi-telemetry-acceptance-gate
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-acceptance-gate
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:46:10.158Z'
    finished_at: '2026-08-22T12:46:16.906Z'
    artifact_digest: a6b8b60649a05e1436353e3e63f23b8240521a3dbb439a3dc5b289af294f897e
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6748
tags:
  - telemetry
  - acceptance
  - diagnostics
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-telemetry-acceptance-gate
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-telemetry-acceptance-gate
  required_case_symbols:
    - SYM-test-packed-telemetry-acceptance
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises `kibi.telemetry-acceptance.v1` through a fresh packed CLI installation, including successful enforcement, fail-closed exit behavior, canonical preflight correlation, repeated failure detection, and unfiltered quality-diagnostic presentation.
