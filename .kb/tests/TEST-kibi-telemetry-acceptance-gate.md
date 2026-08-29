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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3c7cf0a68d081934e0e0c484
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
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:08:05.291Z'
    finished_at: '2026-08-22T21:08:12.413Z'
    artifact_digest: ae6be44b236581324ebac7160bcff2be923ecbea9729170cbaad8235462adb8b
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7122
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6b0c78ddcb7747185b96084d
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
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:35:05.261Z'
    finished_at: '2026-08-22T21:35:13.233Z'
    artifact_digest: 2eb5b9701c5a1a622e401595d2ee00ae3d4a21bd1e99ecf8df543c392351fdb1
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7972
  - version: kibi.verification-receipt.v2
    receipt_id: VR-46e9c8bdde691e2912d09dbb
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
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:04:51.716Z'
    finished_at: '2026-08-22T22:04:58.638Z'
    artifact_digest: b2035b924b893962899ad59be452d34aec727c9ab9961b42c49cac4f606e7581
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6922
  - version: kibi.verification-receipt.v2
    receipt_id: VR-954bd1ad327d7bb7f9401b71
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
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:34:56.620Z'
    finished_at: '2026-08-23T07:35:03.684Z'
    artifact_digest: a05d6813e0af498ea45e5b090c80f746090b287a6bc24cc9ef1ed172ce25d473
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7064
  - version: kibi.verification-receipt.v2
    receipt_id: VR-77787c2d18ab6ea84c04c4ec
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
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:18:27.723Z'
    finished_at: '2026-08-23T08:18:34.394Z'
    artifact_digest: 40ea79dab13af4c45eac058697f60706ff15172f9b7b5e4398eff0500413c24b
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6671
  - version: kibi.verification-receipt.v2
    receipt_id: VR-283b9f1f6adde9d2b411c8aa
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:15:30.450Z'
    finished_at: '2026-08-23T12:15:37.119Z'
    artifact_digest: 26a136566fc48f6eb1560bd9acc70b1ae1543f0ed87ee6c5d0a549ab84c6936d
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6669
  - version: kibi.verification-receipt.v2
    receipt_id: VR-27a5320e6b62a128050c1858
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:15:29.070Z'
    finished_at: '2026-08-23T19:15:35.772Z'
    artifact_digest: 3de8fc16763f1f6fb2bf9a7eaa7592eb703f46ba51271917831c952b7e1735d0
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6702
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1ef31dc20b284ba863c3ca70
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:41:38.356Z'
    finished_at: '2026-08-23T19:41:45.242Z'
    artifact_digest: db175b1661f90282eaa04eb8d21f538aa57290436d8d78ebc2f429ff6ec188d3
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6886
  - version: kibi.verification-receipt.v2
    receipt_id: VR-80657840f13a488c9834f463
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:09:27.322Z'
    finished_at: '2026-08-23T20:09:34.463Z'
    artifact_digest: 76ba3cd463f68679354503f7f4c6e72af25b5cf0bb3eb90a699b4d2e02bedbf2
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7141
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1e293de913d54ed56cc5a60a
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:35:45.659Z'
    finished_at: '2026-08-23T20:35:52.400Z'
    artifact_digest: 91faaf4525df0b43f571c7586f13a01f9445a6dbb0de8c504416b4a51fc3f847
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6741
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6bb097100e8dd1744eeb1366
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:16:29.881Z'
    finished_at: '2026-08-23T22:16:36.348Z'
    artifact_digest: c8693d5cf3feb5b8fe9cc62c0541cef1898bf3b7ce41c8a573d3556003b54138
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6467
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c355a9ce0aa53e25d9bc0be1
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:42:41.534Z'
    finished_at: '2026-08-23T22:42:48.108Z'
    artifact_digest: 4c5879c0186872cb5dcf42c17be55562fea74b636eb76c841de7f46c8f2bf576
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6574
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d9822c2ba5a053264b5f4adb
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:28:34.673Z'
    finished_at: '2026-08-24T06:28:41.716Z'
    artifact_digest: b951732269f22c2b3cbf8249ea340871c12e05228a6e8b2efde64422bf21f4a1
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7043
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c746f94963d101f41d1e7a87
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:56:43.287Z'
    finished_at: '2026-08-24T06:56:50.468Z'
    artifact_digest: 7e4c325f752e62f60c09974ff4e1a45158ba2c79c943f0fbc3ea8893363b6a05
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7181
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1806322756ff84a5fb61fc6b
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:26:32.519Z'
    finished_at: '2026-08-24T07:26:41.025Z'
    artifact_digest: aaf755544376259ed34e984cfbffcc1675372a98f84290643e0f6cf6a2a3d0d5
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8506
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fd307249b750539541f055a1
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:51:20.306Z'
    finished_at: '2026-08-24T07:51:27.732Z'
    artifact_digest: 74dccad9f36f20fe2ab52f1780be1a4a38fa45f29a840523ff08b04bacd94188
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7426
  - version: kibi.verification-receipt.v2
    receipt_id: VR-323d9312a35c2bcc3d8ad2a4
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:23:40.800Z'
    finished_at: '2026-08-24T08:23:47.646Z'
    artifact_digest: 4c846cdda580becf582c6cabdc3ad740ab8954dfd448baedc51c0bd80895251f
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6846
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d21e6a566593c86e9a86aab5
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:53:48.478Z'
    finished_at: '2026-08-24T08:53:55.795Z'
    artifact_digest: 75d904d6bcd18d3cb1625b38a7053e33b46ef5492ffa935657dc0cdf09f1e84f
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7317
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c913f4a61111eb83cc3b35cb
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:56:34.844Z'
    finished_at: '2026-08-25T20:56:41.701Z'
    artifact_digest: 64d3f2395eca5e022e471196015dc172d3462a1c143eda033f47838cc076f2bc
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6857
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1909f281ecfa14f8de0f4337
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:48:25.271Z'
    finished_at: '2026-08-25T21:49:26.296Z'
    artifact_digest: 8d83472bd54a0f2e76ed10dc64a03df31714b7e17c0e6980284fed2a3f20e5e1
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 61025
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c2f9efa24b0e4ce07bcd5ebb
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
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:31:51.318Z'
    finished_at: '2026-08-26T08:32:32.914Z'
    artifact_digest: 84f7438ef6abae04616e151aab4ab2d6cae1fbfc389f52c5ebf8a52166463bd5
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41596
  - version: kibi.verification-receipt.v2
    receipt_id: VR-42fa81a1c923da42374b25da
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
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:51:20.889Z'
    finished_at: '2026-08-26T13:52:28.244Z'
    artifact_digest: b37e23a079f3f1696b1803f95145f740642e79051b1ece178f5daa3e1b553260
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67355
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6e4c8a01c7105188a9c9d3a8
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
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:43:31.826Z'
    finished_at: '2026-08-26T15:44:40.036Z'
    artifact_digest: ce234bee4728248b06ba0c96248f55e955418ecd72ff973f0895e18776fbbde1
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 68210
  - version: kibi.verification-receipt.v2
    receipt_id: VR-db89bab23336a3357161b18f
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
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:44:36.601Z'
    finished_at: '2026-08-26T16:45:56.062Z'
    artifact_digest: 57fe4423b0b553d94fdaccaf9ab0f5e3bb5c0c5cc5c27914a24bf7ed1c665712
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79461
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0897695b53844d11d16752dd
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
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:32:56.664Z'
    finished_at: '2026-08-28T10:34:03.686Z'
    artifact_digest: 7e66c7170bbb4d506f017044598efd2697855a0ed25daa921f11dff890872b25
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67022
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c99f78e5d797fc323b3bc721
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
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:39:44.256Z'
    finished_at: '2026-08-28T13:40:43.233Z'
    artifact_digest: c6215c0afe594728626cba23c38849d8f8594610915291e2dd5a3463e8d20e14
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 58977
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc2d5f109b54a76ac89e4304
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
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:23:43.794Z'
    finished_at: '2026-08-29T01:24:42.805Z'
    artifact_digest: b64b1bb63504659b9100650160967ac2e3d5b00f44b3d1801493e3d655cf0eca
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 59011
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4b1b753f3ffbb597979b192a
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:41:52.366Z'
    finished_at: '2026-08-29T07:42:28.475Z'
    artifact_digest: f5ee24f8d362d88b50049ba53e810d78341a8fc772e2655ff72523af138f1991
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36109
  - version: kibi.verification-receipt.v2
    receipt_id: VR-efb1fc8efaf36d1690900ca3
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
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:11:40.264Z'
    finished_at: '2026-08-29T08:12:17.168Z'
    artifact_digest: 4369a702a7dc565e553694fbefd97f2e3640f5f45e48b53c46465612f75966bf
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36904
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a303c1f8bedfbb446a1a23cd
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
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:43:16.674Z'
    finished_at: '2026-08-29T08:43:53.033Z'
    artifact_digest: ae0117758027a46b77b11b7d2838271446ef7ed2454ce6d6b039c4b158644be8
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36359
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3e11883772fc969bb5adc9c5
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
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:32:17.115Z'
    finished_at: '2026-08-29T09:32:51.835Z'
    artifact_digest: e4a26d71ff3843e1bebf96ecaa946b8a12b738a240abc45c8a5bdc2a9ce19cf4
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34720
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3f2075d0c417cbf816480948
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
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:02:29.346Z'
    finished_at: '2026-08-29T10:03:09.118Z'
    artifact_digest: 3214068a9c8c694ac8770a4e1d4e92c270969b5ea51dc94645d11db5d8f5f888
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39772
  - version: kibi.verification-receipt.v2
    receipt_id: VR-31a0ba10ad9fce6223eddb13
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
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:42:21.261Z'
    finished_at: '2026-08-29T10:42:57.447Z'
    artifact_digest: e91d678c7bf3ad5217d52cd22fc673cb335034b13b73567fa1de452c4fddbeb3
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36186
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a70c5686bb0c3b302ea8e059
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
    code_snapshot: 4dcb52daacd2e6301cb225622dbda1c10a95ea1252b73faa3a34235c61fe9d71
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T11:14:00.795Z'
    finished_at: '2026-08-29T11:14:36.212Z'
    artifact_digest: bfcbe4ed8e16aeddc8117ac99777aa66e693ee97e998637d70e1542dc9ee3995
    contract_hash: 5da2bb6bde0a390f5577f2a61a6dde2846fc0959e6e75be85b1b12327cb977d7
    case_results:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35417
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
