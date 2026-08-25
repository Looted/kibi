---
id: TEST-kibi-telemetry-remediation-evidence
title: Packed correlated telemetry remediation tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-telemetry-remediation-evidence.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-TELEMETRY-REMEDIATION-20260810-01
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/telemetry-remediation-evidence.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: f55c21c124a7a4edf03452e3f42b7cdda0df544e245c95035bfb3c4bb4996714
    environment_hash: 0101ced91a67a9356cf6dfa763d82002b3f363120b391c64f87e988a48f56943
    started_at: '2026-08-10T21:20:29.042Z'
    finished_at: '2026-08-10T21:20:56.173Z'
    artifact_digest: e788852b35bc62d300088044ceb635d44f22d1a4f244652a2a655ab82c23b46a
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e8747f8893cd7d691d54bbdb
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:16:44.925Z'
    finished_at: '2026-08-16T19:17:26.857Z'
    artifact_digest: 02b68ca001d0eb225143ce1d36e8ff8cbd559ebafc3ed50db564bb51b78c7bf3
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41932
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e30e00242e50a030ce02be72
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:25:27.726Z'
    finished_at: '2026-08-16T21:26:05.795Z'
    artifact_digest: 29e62a348ae5c34fbac311b7c5808ce62f58a09302d7b6be9ec96c4b7e168d9c
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38069
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d56de5b20e0e2369bfd87995
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:51:02.305Z'
    finished_at: '2026-08-16T21:51:41.890Z'
    artifact_digest: f60dcd6f3700bf6b49f6a57715735e880264c26050002e1f7c1f48246fcd8897
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39585
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d3e02677df3a0f3371c385f8
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:12:47.214Z'
    finished_at: '2026-08-17T12:13:22.402Z'
    artifact_digest: 84e446fa2bb9023d88a764c2043910f67675581efe91344d8cc358e3d597559f
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35188
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e9b5ce1ecb47042cc2b3099a
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:05:11.628Z'
    finished_at: '2026-08-17T21:05:48.688Z'
    artifact_digest: 161efe75f8873b692c80cdbe5788ef19c70c42cc34ecdad6eb50d415bbf8e4e7
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 37060
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ad8b5e67238a1761f8bdbff8
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:19:56.478Z'
    finished_at: '2026-08-18T07:20:35.242Z'
    artifact_digest: 4088e8b02af8f21d2421157c719e940ede889abd7bcfaf426784c95c4df24582
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38764
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d1f61d5737f62ec305709caa
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:47:38.233Z'
    finished_at: '2026-08-18T10:48:18.256Z'
    artifact_digest: a7532d185fffce39dce1358a0f42597ecac3b85faee47284b2881d8966ad01c4
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40023
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a858e95a725233429fb04b6f
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:55:05.365Z'
    finished_at: '2026-08-21T21:55:13.369Z'
    artifact_digest: 3d839bdea99fe10533b26ccbb143ffb3ce5e4c753510e03d08ee1bfa72d1985b
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8004
  - version: kibi.verification-receipt.v2
    receipt_id: VR-529fd6876c5b850e6e8af95b
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:10:26.908Z'
    finished_at: '2026-08-21T22:10:34.619Z'
    artifact_digest: 6810b46adc6db55c9695c78fd509f64a7f7c5be54e10f9e915a7bf9b3a6de8c3
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7711
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dae1c3abbf1b2b416999137b
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:01:42.888Z'
    finished_at: '2026-08-22T01:01:53.265Z'
    artifact_digest: 66fede554e73b503dc615695d057a1d146a9591cdcd1572e7b28823b19c6388c
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10377
  - version: kibi.verification-receipt.v2
    receipt_id: VR-006bf12d582224025d61085e
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:02:56.804Z'
    finished_at: '2026-08-22T08:03:04.701Z'
    artifact_digest: 2eeaf7bbc333e7b9b2f465f02ae9b628833b2c343f4569664b548bd37392505c
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7897
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7dbaec12de2cd7d938b83cd2
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:51:17.879Z'
    finished_at: '2026-08-22T09:51:24.519Z'
    artifact_digest: 5f5b9d786315fe7a1527a3699391551d00847e35215bf6bbbed451761abac708
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6640
  - version: kibi.verification-receipt.v2
    receipt_id: VR-aea822221c36385ce5cef2a8
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:46:22.409Z'
    finished_at: '2026-08-22T12:46:28.190Z'
    artifact_digest: 5accbbbecd0cde8d0ba6dd3aed0e5340fd974a4a946babadb70d375e92c1f20c
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5781
  - version: kibi.verification-receipt.v2
    receipt_id: VR-54fb950b017953dd627507c9
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:08:18.433Z'
    finished_at: '2026-08-22T21:08:24.791Z'
    artifact_digest: c7ffae9756078fb33ef08588338c310cfb6c6ae89c73cb14caef9c1a9eb3f1fb
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6358
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e423a01607d510515dfe8ca2
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:35:19.753Z'
    finished_at: '2026-08-22T21:35:27.084Z'
    artifact_digest: e296d2045a4ab30ec09712dc12ca4a290347841078bb35c217ffbab7f6e012ad
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7331
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7a154ff2ce2998c25fd7b3db
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:05:04.317Z'
    finished_at: '2026-08-22T22:05:10.332Z'
    artifact_digest: f2df3795410affa660e1729ab807f22c7a71d95cbe173d8c00dc715f8cf738a7
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6015
  - version: kibi.verification-receipt.v2
    receipt_id: VR-092c21ed7b3d71973380b884
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:35:08.942Z'
    finished_at: '2026-08-23T07:35:14.757Z'
    artifact_digest: ab6fc5a48de522aa900c6ba570ab6682f07e0a4ae0288c530f5466aab767b510
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5815
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3e217697171b30e0b9ec89f7
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:18:39.861Z'
    finished_at: '2026-08-23T08:18:45.901Z'
    artifact_digest: 5cefec0c0b156ec8407836c5af2bcb37bbfd4fcbe86cdd8c0255c06e85a1029f
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6040
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4641f9131351fa35ab34ed16
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:15:42.315Z'
    finished_at: '2026-08-23T12:15:48.117Z'
    artifact_digest: f7ccc30f02126918bbe359022c00b9d6ae5f2e9411a770427d2771821a42ab45
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5802
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9426302b3a188eca80d96d7f
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:15:41.263Z'
    finished_at: '2026-08-23T19:15:46.973Z'
    artifact_digest: 038aa5086b230cd2efa65e260e3624ca8a1899bf8660fc2b299a838a8302728b
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5710
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0f12239cba4d73a747984927
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:41:50.969Z'
    finished_at: '2026-08-23T19:41:56.823Z'
    artifact_digest: d466e286dc60c7b5c67f375d12ac9b614a41d76a8558845544914401bbc325b7
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5854
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7ab37e38b4809796847b0564
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:09:39.812Z'
    finished_at: '2026-08-23T20:09:45.537Z'
    artifact_digest: f2012a99aa91a72190c89413938715bc8ca52e3a1d93dfc0f436caa35207d721
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5725
  - version: kibi.verification-receipt.v2
    receipt_id: VR-86e0d14694c86849e73ef421
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:35:57.698Z'
    finished_at: '2026-08-23T20:36:03.402Z'
    artifact_digest: 0f0be012d94b7304d2cfe4efd706e5a2933f4247f139c34a17e03d142a76bc25
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-85a238b3ee507f878a65e5f6
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:16:41.512Z'
    finished_at: '2026-08-23T22:16:46.959Z'
    artifact_digest: 3bd5392ab2f2e3b2932dd3b5bde46097d9571610db2388893020ebe0ec6c59f6
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5447
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e57afe1afde6fcab3b14713c
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:42:53.378Z'
    finished_at: '2026-08-23T22:42:58.908Z'
    artifact_digest: 97746b9dc11b2afd245fd9cdbad3433907a88ec1a272ae6813baf3eb0f3a38e4
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5530
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eb3a9e05bf2a49ed97806b3c
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:28:47.092Z'
    finished_at: '2026-08-24T06:28:53.440Z'
    artifact_digest: 509c9a44518a5305e5bf0ca5f275dac48779d43f92e5d57216b401c77a1cfbe8
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6348
  - version: kibi.verification-receipt.v2
    receipt_id: VR-98033eb1efbcd59384451fb6
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:56:56.616Z'
    finished_at: '2026-08-24T06:57:02.591Z'
    artifact_digest: 4d372cbb3fec1ea9b87e97a4ecd3b7f347151ac1f1de703311cb5677f6f132eb
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5975
  - version: kibi.verification-receipt.v2
    receipt_id: VR-59cef6876ff4b1898753ca10
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:26:46.491Z'
    finished_at: '2026-08-24T07:26:52.524Z'
    artifact_digest: 4f611791aa26d7088b2994bdb51ed14529b21e7cc786940abd686a4ba139d025
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6033
  - version: kibi.verification-receipt.v2
    receipt_id: VR-64be606770e4cc751843a5e2
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:51:34.623Z'
    finished_at: '2026-08-24T07:51:41.327Z'
    artifact_digest: 12f5a37b0fd2dc422b5e50b50dbf0fc327cf4cf1a15b1caef89ad12706740277
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 6704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-227c08cf79b07af39c02b54f
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:23:53.352Z'
    finished_at: '2026-08-24T08:23:59.200Z'
    artifact_digest: c249ef7402e260e2efd889d3b5fc1c6bcc88be8b3fb31af70e9da47c318166fd
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5848
  - version: kibi.verification-receipt.v2
    receipt_id: VR-074cc68f0562c466a6a4b847
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:54:02.311Z'
    finished_at: '2026-08-24T08:54:09.639Z'
    artifact_digest: fa1903a5f69ce5dbc2c5ec3acbd2d9e492802e7d14045d584620a88714ad7d42
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7328
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d8dae420f7d0d74e1d77f36c
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:56:47.115Z'
    finished_at: '2026-08-25T20:56:52.864Z'
    artifact_digest: 44053c3ff044c818769846867dd3657cf02ff3e6919681c1d05488a8981b3815
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 5749
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8f4679edbef573239af44af6
    test_id: TEST-kibi-telemetry-remediation-evidence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-telemetry-remediation-evidence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-telemetry-remediation-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:49:31.848Z'
    finished_at: '2026-08-25T21:50:31.634Z'
    artifact_digest: 6af64085006f3f226e8628d09a9ae5c145c260c614cf585466c7d69313a7f718
    contract_hash: 7fb18056888e77d85b1c92e819b830e050be47210c4e89f236319b4e0099f153
    case_results:
      - symbol_id: SYM-test-packed-telemetry-remediation
        project: default
        outcome: passed
        retries: 0
        duration_ms: 59786
tags:
  - telemetry
  - diagnostics
  - remediation
  - cli
  - mcp
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-telemetry-remediation-evidence
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-telemetry-remediation-evidence
  required_case_symbols:
    - SYM-test-packed-telemetry-remediation
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises correlated diagnostic records and `kibi.telemetry-remediation.v1` through freshly packed CLI and MCP binaries. The test proves semantic logging parity, hard correlation when both session/actor identifiers are present, exact event references, deterministic repair order, explicit report-level evidence gaps, and read-only command behavior.
