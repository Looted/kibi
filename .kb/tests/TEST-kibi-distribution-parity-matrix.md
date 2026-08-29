---
id: TEST-kibi-distribution-parity-matrix
title: Source, packed, dogfood, and pinned distribution parity tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-distribution-parity-matrix.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PARITY-20260810-01
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/distribution-parity-matrix.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 967625f2316fe19a8fcffb70cf4586a4da1eb6f0bbaa72861d2c2e2ccabf1639
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: '2026-08-10T20:21:47.768Z'
    finished_at: '2026-08-10T20:23:02.743Z'
    artifact_digest: 6305e619b24a6c1b643db11f0de69573cd5815216705927a26bb7486f5209f7d
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ad086ae92e678d9bae321d3d
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:01:07.291Z'
    finished_at: '2026-08-16T19:02:21.468Z'
    artifact_digest: 4d5c1bb18d66e971fbc1d40f835ad6d3fbaa121f54ae65155f8a67f72df01415
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74177
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ab61bbdf736be44261150cd6
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:20:07.961Z'
    finished_at: '2026-08-16T21:21:22.054Z'
    artifact_digest: f6194099e5bc075656058fff8df3efc4e5c52b16e2a41673ea7272e49a98b14d
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74093
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c450d7974475e86c9047f833
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:45:47.072Z'
    finished_at: '2026-08-16T21:46:57.765Z'
    artifact_digest: 0eadbe486191c269a4d12c274618ed4bbeb2e7b3037d51f9a933a229fe385854
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70693
  - version: kibi.verification-receipt.v2
    receipt_id: VR-940d8b465791726de3587940
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:08:02.318Z'
    finished_at: '2026-08-17T12:09:09.609Z'
    artifact_digest: f4daa7afcd418a28aa63f1afeaadfd3e0c73d798eba1f2fc203455e3596fcd47
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 67291
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed4b87d3816999ad8a1a673a
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:58:26.023Z'
    finished_at: '2026-08-17T20:59:37.276Z'
    artifact_digest: 569af0ef80fe7e7c41c44f746a534e9a8d626fcbedb3d1f7ef381c1484d39c3d
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71253
  - version: kibi.verification-receipt.v2
    receipt_id: VR-26bc780cc5a4427c9e94289e
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:12:44.967Z'
    finished_at: '2026-08-18T07:13:57.143Z'
    artifact_digest: f8207cd207f52f4ec2353da89caaa11e7677ddc634a635bc92a7d3517181f958
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 72176
  - version: kibi.verification-receipt.v2
    receipt_id: VR-445755d61300238281228560
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:41:19.198Z'
    finished_at: '2026-08-18T10:42:35.127Z'
    artifact_digest: c6ae47167ac28af07db332ed87684dea6a0262c1b261e7b2d396d30845dc7ebf
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75929
  - version: kibi.verification-receipt.v2
    receipt_id: VR-da9e060a233a8ded842d54a5
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:51:28.104Z'
    finished_at: '2026-08-21T21:52:17.424Z'
    artifact_digest: 03ce5ab98d0a0cbd40ba5009974a79f87e5c9c3570558a63e74b561f5c785567
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49320
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b11f89bf25c110bdc9c95f3b
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:06:52.923Z'
    finished_at: '2026-08-21T22:07:42.124Z'
    artifact_digest: b560801be63baade1837fb1f0c3d9a0cfedb157a714829295a14285a3f314de2
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49201
  - version: kibi.verification-receipt.v2
    receipt_id: VR-56df37b85af03db73e1733f1
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:57:01.147Z'
    finished_at: '2026-08-22T00:58:05.102Z'
    artifact_digest: 755bdc5259df07372ad6f9b8b7bdeac401752f3331a4106b92d1c564d832fd8b
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 63955
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b4b1931d38d932742ac2a486
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:59:15.320Z'
    finished_at: '2026-08-22T08:00:05.007Z'
    artifact_digest: 0d30e902a5a7f25806c64dcbe44fd2be5cbcb4b5a6a7dbcdf771d883ae487265
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49687
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5da1e3f6bdaf2c8c6258185e
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:47:26.463Z'
    finished_at: '2026-08-22T09:48:12.955Z'
    artifact_digest: 9c840a58119fcb58fbcf2f59f75d42bbdd04d1fcc0d4ea0b92ff3abde590a549
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46492
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9181a4bd8c358b0e366818ee
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:43:29.733Z'
    finished_at: '2026-08-22T12:44:12.176Z'
    artifact_digest: 455fdfd1060e925631acfa203b65e5602e9181457e3358c10e5cdb910d59f2bf
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42443
  - version: kibi.verification-receipt.v2
    receipt_id: VR-257f5e0c0a27157e1bef5df0
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:05:22.754Z'
    finished_at: '2026-08-22T21:06:05.421Z'
    artifact_digest: c4855ce2cc0d744bac7872b0862ebb7cd826c622e8343782d580736872435e9e
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42667
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9be291a963fd2599692bc8b6
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:32:02.418Z'
    finished_at: '2026-08-22T21:32:48.467Z'
    artifact_digest: 5127864014b44ad507b13b08c990c14c7b57e23f3b55ff5a0f7d0feba94fff63
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46049
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b3190f9b0a938d0dfa009545
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:02:17.752Z'
    finished_at: '2026-08-22T22:02:57.369Z'
    artifact_digest: a500f513c580e1d428b117e6ddf90ed05a041e66ad5d11595f4a279db6d1b866
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39617
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7c3465aa4dde6bf0bd241e79
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:32:11.487Z'
    finished_at: '2026-08-23T07:32:52.138Z'
    artifact_digest: 4801308083ee672c6e112c0950eb3620d8571933ab6b938fc61e89c47f896c08
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40651
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a0c4e384d6da63ff0b470309
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:15:51.019Z'
    finished_at: '2026-08-23T08:16:31.734Z'
    artifact_digest: 9986aa4d6cc774e4c610ca1c7acca309618728617998063053390b2a7b01db04
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40715
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d0fb4f097de09dc67adbba99
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:12:58.189Z'
    finished_at: '2026-08-23T12:13:38.063Z'
    artifact_digest: 604195bbe82054118dacda9600a5ee1fca1ab7028464100c9ef4d2bb2ec9219b
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39874
  - version: kibi.verification-receipt.v2
    receipt_id: VR-63f32e740355eaee35d144da
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:12:46.258Z'
    finished_at: '2026-08-23T19:13:28.229Z'
    artifact_digest: 4c1756ad9c707035471eb606256dbd333131b28f7dfe36cc4feb81ad94b63c24
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41971
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9ade149edded61ed9eace8d0
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:38:57.424Z'
    finished_at: '2026-08-23T19:39:39.176Z'
    artifact_digest: d8d041d4110854909e5c266f7d2da69330bbd5432b769f595091c954ea401cba
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41752
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4a98c35ec4e714c3b6583d2f
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:06:51.980Z'
    finished_at: '2026-08-23T20:07:32.802Z'
    artifact_digest: f61903a410fceb5982ccd0d0fa7d267663768e0715adace395517482b9ef24e8
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40822
  - version: kibi.verification-receipt.v2
    receipt_id: VR-109cb4f39c0998acf4ed4cb7
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:33:10.713Z'
    finished_at: '2026-08-23T20:33:50.844Z'
    artifact_digest: 974b9b1133ea564228d33e8d7a7894e9ab0948f5dbb6c7311d4e35cb74ccb5ca
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40131
  - version: kibi.verification-receipt.v2
    receipt_id: VR-541e5bad527cb14ff6f4a582
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:14:01.226Z'
    finished_at: '2026-08-23T22:14:40.418Z'
    artifact_digest: 7eb09dfe5cb51788295178abfc84e4354b187491bb2ace4ca37ab62feed2544c
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39192
  - version: kibi.verification-receipt.v2
    receipt_id: VR-03902100046d42ccb8ce2885
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:40:11.822Z'
    finished_at: '2026-08-23T22:40:51.166Z'
    artifact_digest: 40ad7c48baf81f120756000a7451709c4224159f3c5c99aee33438f0a0c57faf
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39344
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6003084b701502e2b6c1447c
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:25:41.874Z'
    finished_at: '2026-08-24T06:26:24.492Z'
    artifact_digest: dadc78377ebc5096a32e31f96354035a0e787a36557c1c9bc7672c00e78a0229
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42618
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8fd504127cb09b7de699e87a
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:53:39.537Z'
    finished_at: '2026-08-24T06:54:30.542Z'
    artifact_digest: a74ccb80f6274b73b9338d104889e78a8cd925633241714bb68fd358625e0c66
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 51005
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bb7fe248c40de81d70e79040
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:23:43.536Z'
    finished_at: '2026-08-24T07:24:27.495Z'
    artifact_digest: 20adc6c0ed3ead516dd81f26a04c159ad9698da99673175d558fb2bb9969ef11
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43959
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d693325273610c0858628987
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:48:30.104Z'
    finished_at: '2026-08-24T07:49:10.701Z'
    artifact_digest: 6fb22f9c4f4ca9388d4554efb4487de6e3a8d6f9bf4e28db18ba0781a56b8713
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40597
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7076925322c6e266f8167cd
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:20:48.571Z'
    finished_at: '2026-08-24T08:21:31.433Z'
    artifact_digest: 2d749aa283517d3442694665f61a46c8cfe74d7349766de2f7df01a1e34055f6
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42862
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7cd7e6a75271779c1b90d720
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:50:33.356Z'
    finished_at: '2026-08-24T08:51:24.988Z'
    artifact_digest: 367ab4e112373f7f25df90136400a4db25b7e4795acd267cb5ba7ebd9c8150eb
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 51632
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d3f8fff3acab3bc9ced6b9d0
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:53:50.962Z'
    finished_at: '2026-08-25T20:54:33.362Z'
    artifact_digest: 5f4ba9ad5c69aee079593d986b2fc711f7228ffb8f8509b6bb2e8be0b66cf31f
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42400
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bf532ea29e415fa7d689dfd4
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:39:06.565Z'
    finished_at: '2026-08-25T21:40:47.915Z'
    artifact_digest: a1f4e72549720c1bbe2a6a65008101e165ea83bb9fdad117e49e809a90e00b4b
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 101350
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8d2f41305fc6fe41e73dd6ac
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:25:18.109Z'
    finished_at: '2026-08-26T08:26:21.037Z'
    artifact_digest: 94fb1a27acf29493a9e5de7e0c882ff4f53d0151c0f450b0644ba50f7b5fa054
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62928
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fb51bb089994dfe3e2a2112c
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:41:29.148Z'
    finished_at: '2026-08-26T13:43:20.031Z'
    artifact_digest: 830197ad663b6474ecc66ef9609a854ef35528dd9f19577aa96937fb1c50ec92
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 110883
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cda09ea33f371a2b80eb6cda
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:33:20.410Z'
    finished_at: '2026-08-26T15:35:02.553Z'
    artifact_digest: 45f8d88569dfe890932984d90f3fdcafddd39b813eef52e090a2001f68d2e110
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 102143
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2896129be06a7eed7c223c0a
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:34:18.278Z'
    finished_at: '2026-08-26T16:35:59.018Z'
    artifact_digest: 7c2013d6c36d5042fd9c1c28be5542586d1f7c8aea834bfd500d0cb7de2c8a28
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 100740
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ec5cb443825ba409396a5a77
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:20:59.735Z'
    finished_at: '2026-08-28T10:22:36.341Z'
    artifact_digest: 42258b4613eeba7b386055b46db479b4a8a32f3f822107d6b6e9c9a8739e715f
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 96606
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5fb48812564de2623580839e
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:28:04.470Z'
    finished_at: '2026-08-28T13:29:39.592Z'
    artifact_digest: a9f80c2a386e3c13b5d0704b7e73e3ae99752f782dd9fecdba9fa8d413191518
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 95122
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8a03509ebd2cfd6c73518e14
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:03:40.413Z'
    finished_at: '2026-08-29T01:05:18.106Z'
    artifact_digest: b5ea072fa582512ff72a4ff8687443129db16a251fb3a5729c3c9474c9526327
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 97693
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e224f63e4f6fc74dd0591359
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:35:16.905Z'
    finished_at: '2026-08-29T07:36:19.904Z'
    artifact_digest: c8408b7af741ce3fd7a1910f07064d8b886d9023182bda25633d14732e441c5e
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62999
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2d426c71c981088a02a2f93c
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:04:02.728Z'
    finished_at: '2026-08-29T08:05:07.958Z'
    artifact_digest: 6b93961b1bc31c099b4482d9a989667330bd190d594a95cac7a4ae36f667734b
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 65230
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dfc4ae195313c855d46268e1
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:35:56.398Z'
    finished_at: '2026-08-29T08:36:58.731Z'
    artifact_digest: b888919658db1893026417b5b8fc5607f527ab3652d954b7e817546f887bb2b0
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62333
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e38c782ea29cbf603a39cd9d
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-distribution-parity-matrix
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:25:03.526Z'
    finished_at: '2026-08-29T09:26:09.175Z'
    artifact_digest: 877fba96eef11f948a9d1f041f042581d5144350e67a48926e3bea4ec751ad47
    contract_hash: 2352f1749e43e20f35cb64c265e7f3db698be2699a73b547b7cb9dec5887aadf
    case_results:
      - symbol_id: SYM-test-packed-distribution-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 65649
tags:
  - parity
  - distribution
  - dogfood
  - packed
  - cli
  - mcp
  - e2e
links:
  - type: validates
    target: SCEN-kibi-distribution-parity-matrix
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-distribution-parity-matrix
  required_case_symbols:
    - SYM-test-packed-distribution-parity
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises `kibi.distribution-parity.v1` through source and freshly packed CLI/MCP binaries, then optionally through the binaries actually resolved by audited projects. The fixture set checks proposition ingestion, source-bound contradiction witnesses, conservative proof stages, dependency-ordered repair plans, snapshot-bound receipt gaps, and telemetry acceptance. Align is expected to resolve this checkout and match; BizzWords' older pinned CLI/MCP capabilities must be reported as unsupported rather than silently passing, with a named upgrade action for each divergence.
