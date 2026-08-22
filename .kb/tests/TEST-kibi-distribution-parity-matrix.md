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
