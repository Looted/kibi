---
id: TEST-test-journaled-engine-harness
title: Journaled engine test reuse, isolation, and cleanup suite
status: passing
created_at: 2026-08-12T00:00:00.000Z
updated_at: 2026-08-12T00:00:00.000Z
source: packages/cli/tests/engine.test.ts
priority: must
tags:
  - testing
  - engine
  - cli
  - e2e
links:
  - type: validates
    target: SCEN-test-journaled-engine-harness
  - type: validates
    target: REQ-test-journaled-engine-harness
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-test-journaled-engine-harness
  required_case_symbols:
    - SYM-test-owned-engine-runner
    - SYM-packed-e2e-runner
    - SYM-proof-runner
    - SYM-shared-npm-cache-resolution
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7321db37149b198b57887649
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:18:48.432Z'
    finished_at: '2026-08-16T19:29:59.259Z'
    artifact_digest: fa2852f48589221af1682cd570e91769f01577939947ceeaf11a74a092265d3e
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 670827
  - version: kibi.verification-receipt.v2
    receipt_id: VR-44cbf456e54cd05d505b230a
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: failed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:27:22.572Z'
    finished_at: '2026-08-16T21:38:19.867Z'
    artifact_digest: 7d359452fb90c468075d7e4bdffcd2efaebdd0ff083ef345812027847e8d02b9
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 657295
  - version: kibi.verification-receipt.v2
    receipt_id: VR-061272bb206e97f259d5d835
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:52:37.664Z'
    finished_at: '2026-08-16T22:04:36.557Z'
    artifact_digest: 4ec83bfe2bdd60775c981c8200fe2d847e7f13b415853f2b617a77b9d4c9a941
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 718893
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65a6bc1db4b42560684d1eb8
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:14:11.386Z'
    finished_at: '2026-08-17T12:25:09.941Z'
    artifact_digest: a89d92e894cd6a0c60ba2d5414668e0c2d4a0a862d6ae3d2f2a6ad8bb81e89bc
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 658555
  - version: kibi.verification-receipt.v2
    receipt_id: VR-432b216e10e91c261b98af25
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:06:39.460Z'
    finished_at: '2026-08-17T21:17:49.957Z'
    artifact_digest: 05b5156ef3ba61db39753e68234a3c5649bd6324e3db935e62091f7db1010d3e
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 670497
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4522c9027a4a5bcd29bdf2b2
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:21:29.751Z'
    finished_at: '2026-08-18T07:33:20.765Z'
    artifact_digest: c8283509aa5b2863315bc2648e51a73973f91ba461b8e2163d950a47408de7f9
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 711014
  - version: kibi.verification-receipt.v2
    receipt_id: VR-db5ab989990071490c5fcc92
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:49:12.696Z'
    finished_at: '2026-08-18T11:01:17.867Z'
    artifact_digest: 2c75c88d31b00fc14423fcb08d14e55d46921d0261dac15f3ead42a281ff7d2b
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 725171
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b36f90dad98f53d88737c76e
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: failed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:11:05.103Z'
    finished_at: '2026-08-21T22:25:06.808Z'
    artifact_digest: 4ae0d586036b04863eac6897a592068df4bcc391904a478a3a3f52210a72aa7b
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 841705
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 841705
      - symbol_id: SYM-proof-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 841705
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: failed
        retries: 0
        duration_ms: 841705
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d64f100b6d6deff7f4a70563
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:41:38.405Z'
    finished_at: '2026-08-21T22:55:40.040Z'
    artifact_digest: 71c56cd7be64aa7db69c412ca5b9751e29f4344f4d8dd0ab5b7c9b90a8308645
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 841635
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 841635
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 841635
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 841635
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d0aea59ca4481eeb379b67fc
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:02:31.615Z'
    finished_at: '2026-08-22T01:21:24.330Z'
    artifact_digest: 3ae69705985c76865f0bac23d5c8247377d102209a7e196350092487ebdeee85
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1132715
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1132715
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1132715
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1132715
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dec3d21bae9f87af5c8718ff
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:03:36.756Z'
    finished_at: '2026-08-22T08:23:12.097Z'
    artifact_digest: 0203529035385291ec21d107231d0cca9c75ddb422e59f2e8a02a658d93d345e
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1175341
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1175341
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1175341
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 1175341
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b06560b6e5d01ea5cce09964
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:51:55.485Z'
    finished_at: '2026-08-22T10:04:32.050Z'
    artifact_digest: a8ee32ce109fcd6087e9234c83c4cc9bd167d2b270e26f3dfe9edfcd4950c38b
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 756565
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 756565
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 756565
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 756565
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ef60995854c5a2801d0c8e6
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:46:50.797Z'
    finished_at: '2026-08-22T12:58:27.907Z'
    artifact_digest: 87e736045d7bc363ece0fd555f944b657c844402fe1a00757c9a77dd81d83348
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 697110
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 697110
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 697110
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 697110
  - version: kibi.verification-receipt.v2
    receipt_id: VR-761d2a31758148868f6e96e7
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: failed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:08:47.973Z'
    finished_at: '2026-08-22T21:20:51.966Z'
    artifact_digest: be45f1c6ea5ee137792e55a4a68a1b58db42929b34ed24e7bf32070c67c29e32
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 723993
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 723993
      - symbol_id: SYM-proof-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 723993
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: failed
        retries: 0
        duration_ms: 723993
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4eda4720508c4ea6aa1f1339
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:29:33.281Z'
    finished_at: '2026-08-22T21:42:29.099Z'
    artifact_digest: ade02da22268db0b2ae037b477f83df09fee0a7384ed25202da8bfe9ceeccfdd
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 775818
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 775818
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 775818
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 775818
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8165879eeac0a29562b8fcb6
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:35:53.289Z'
    finished_at: '2026-08-22T21:48:05.712Z'
    artifact_digest: 51478b0d55f02ae08ca35107c6044b66bfa353dca9f13a6fa554315785fee42c
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 732423
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 732423
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 732423
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 732423
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ca6eb95978cf28f8b5f86eca
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:05:33.152Z'
    finished_at: '2026-08-22T22:16:53.258Z'
    artifact_digest: 9ae0f40a9c99ef3f78c087e2a2f7b02fd6d529db7fd06a8e7c29e2839ba6f461
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 680106
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 680106
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 680106
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 680106
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cfdca02dca6fb5ac6b68e37e
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:35:36.775Z'
    finished_at: '2026-08-23T07:47:26.979Z'
    artifact_digest: 99dedb428268b42cf6897ad03e058638fbc01ca1cb08b0c2bcfde87a9d792f68
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710204
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710204
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710204
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710204
  - version: kibi.verification-receipt.v2
    receipt_id: VR-043ca031f1f59f1a7490ddb6
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:19:08.548Z'
    finished_at: '2026-08-23T08:30:59.178Z'
    artifact_digest: 0bcb825d07333b5e51a273dbc387b8fd56acedaab28b279bac9d8e1427935971
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710630
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710630
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710630
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 710630
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7f2483591224ad8931b645c7
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:16:10.455Z'
    finished_at: '2026-08-23T12:27:38.786Z'
    artifact_digest: 9a4963099a7f13ea9e77432487231c05954c7c32d02aac3003e3ad7510518feb
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688331
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688331
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688331
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688331
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e5e8c72534f5b8cb03b6e996
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:16:10.672Z'
    finished_at: '2026-08-23T19:27:50.548Z'
    artifact_digest: c0ea595b157586397c6df72a3868f8fb9d101a0d087f50ea9d12d3904ae8dd61
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 699876
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 699876
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 699876
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 699876
  - version: kibi.verification-receipt.v2
    receipt_id: VR-53a537313db19c42096e8ad8
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:42:19.857Z'
    finished_at: '2026-08-23T19:54:07.614Z'
    artifact_digest: a7ef5c39b3e9ad627a40db8ae315f2c111689af50b480251b3f1d691ff5a6235
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 707757
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 707757
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 707757
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 707757
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bfe349cc332cb4680dcf1ee7
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:10:08.580Z'
    finished_at: '2026-08-23T20:21:37.051Z'
    artifact_digest: b46606ded4d26eb7e0c248ce0473ecfd5d3f978fa79eefc8e5f618410e5e89a4
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688471
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688471
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688471
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 688471
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0634a6b563af49fb9334c970
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:36:26.754Z'
    finished_at: '2026-08-23T20:47:49.633Z'
    artifact_digest: 15a2ba9e62b1b6e6334b7aa73f5bc70e72f32b5193ea34c131002faa4ad7a373
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682879
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682879
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682879
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682879
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a38a302af5e627741982fd48
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:17:08.488Z'
    finished_at: '2026-08-23T22:28:15.822Z'
    artifact_digest: 7d5f38ba8df539e1c4b8f5a2ace0f8e3112beaf8f3090ed3ffb9994abb9ae080
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 667334
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 667334
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 667334
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 667334
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0824d37aae977dd5258d2a5e
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:43:20.946Z'
    finished_at: '2026-08-23T22:54:33.689Z'
    artifact_digest: ccb67eb50018ec20f89341e39a24ee20420c6910596e9417672e58f912adc686
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 672743
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 672743
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 672743
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 672743
  - version: kibi.verification-receipt.v2
    receipt_id: VR-236c99246476704c6874e3c1
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:29:16.853Z'
    finished_at: '2026-08-24T06:42:06.113Z'
    artifact_digest: 93b85790bde8917eac86145c7ef95bf3376ff28b4e6a3811d84ccf17b2daa1de
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 769260
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 769260
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 769260
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 769260
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9a1d61cc7c36ee6847db6fe4
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:57:27.768Z'
    finished_at: '2026-08-24T07:09:37.396Z'
    artifact_digest: ef89660e75e110f7ed1546cd3df56fcce03c4a747918c7e16dd4b3e02b69d963
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 729628
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 729628
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 729628
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 729628
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8d370278672827a84b153144
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:27:16.092Z'
    finished_at: '2026-08-24T07:39:51.409Z'
    artifact_digest: 60deaf0f98366215f00a15f640f11cebeba43bef6f02bda778116d765fe26f99
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 755317
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 755317
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 755317
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 755317
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7ad0d86b011c261a902de92
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:52:05.489Z'
    finished_at: '2026-08-24T08:04:49.574Z'
    artifact_digest: 7c358b7767fac3d2cfbb94485f3471476ddc1b83bd3b946f1324e3224a2e8cc2
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 764085
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 764085
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 764085
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 764085
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d0cb247499810a964453b582
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:24:22.363Z'
    finished_at: '2026-08-24T08:37:41.629Z'
    artifact_digest: 099e3a0560acba7fe499340f56adcc257883e76fa8fa2d9b1a60b71b8abcacc9
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 799266
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 799266
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 799266
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 799266
  - version: kibi.verification-receipt.v2
    receipt_id: VR-63c0e8ef2d7e2d4bbab6ccd4
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:54:37.320Z'
    finished_at: '2026-08-24T09:07:43.201Z'
    artifact_digest: 25133b700cb5911dfbeb7ed14a6330099cb09be1cf75e1969f462c257875a2fe
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 785881
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 785881
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 785881
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 785881
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b64c07b9a74c2b2923a50086
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:08:24.961Z'
    finished_at: '2026-08-25T21:19:47.528Z'
    artifact_digest: 4c1ef45d489bf6ddecaee2d2150e8a2b875098663c00b7ca186c9ad7d47c4b6b
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682567
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682567
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682567
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 682567
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1186183c3cd6e409455df60e
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:51:55.616Z'
    finished_at: '2026-08-25T22:04:10.619Z'
    artifact_digest: bfd6b97a48d4ffb53e8bd9bb34fd30ac4c67b04c18fdad50c92a45887cec87ec
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 735003
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 735003
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 735003
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 735003
  - version: kibi.verification-receipt.v2
    receipt_id: VR-df0d1dd497915bb0ec831e2b
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:55:17.293Z'
    finished_at: '2026-08-26T14:07:27.429Z'
    artifact_digest: 754886bbd46347a81c59032c6f58fa1832f35824e08240ee8f1c9d5e5352e75f
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 730136
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 730136
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 730136
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 730136
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ba4880ce58407297fafbcc07
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:47:26.732Z'
    finished_at: '2026-08-26T16:00:13.950Z'
    artifact_digest: da017df5a856e8920032e49d8cfb4b966729208c5889b7d1167681acd8cadea7
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 767218
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 767218
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 767218
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 767218
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d2ab0e0520d4135111dc0d04
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:48:34.648Z'
    finished_at: '2026-08-26T17:01:36.552Z'
    artifact_digest: b891ed47b7c2b659886be83d20ecff003b41a150d8b12e8d47af2328237648c6
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 781904
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 781904
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 781904
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 781904
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fbab4ce1e555834f67c47935
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T12:59:42.722Z'
    finished_at: '2026-08-28T13:08:04.896Z'
    artifact_digest: c7cedbc60e03c7d8633981679280b8f1d007f4865b2291b9bd433645a5555640
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 502174
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 502174
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 502174
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 502174
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dd7922301cdd1b36aa7e9b16
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: failed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T04:28:02.472Z'
    finished_at: '2026-08-29T04:44:57.570Z'
    artifact_digest: 097e08b38e5ffd5ceb91c0ec228e68a6b88eaf57fcbb384c33aa7d3f9da99c70
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 1015098
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 1015098
      - symbol_id: SYM-proof-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 1015098
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: failed
        retries: 0
        duration_ms: 1015098
  - version: kibi.verification-receipt.v2
    receipt_id: VR-247007f84c364eda016e7853
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T05:17:54.746Z'
    finished_at: '2026-08-29T05:30:58.221Z'
    artifact_digest: 6e2a6ac9a68e231c73919bc102c0be7f40a170c1e80836cd972d1eb899c8becf
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 783475
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 783475
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 783475
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 783475
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4a4593835f9d9ba96028861e
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:18:02.480Z'
    finished_at: '2026-08-29T08:26:33.014Z'
    artifact_digest: 71653cf21e8c5652d6e347252a38e03dd8e2fe442b5c07d17087a28c07876c19
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 510534
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 510534
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 510534
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 510534
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0a3b69d97ae6da41b020e4f1
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:49:25.711Z'
    finished_at: '2026-08-29T08:57:57.128Z'
    artifact_digest: 584c4fe825b48f8b529f751f753a47b687e9383cff6376f8201dbee297efe4e6
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 511417
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 511417
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 511417
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 511417
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc97a30a356779a33c29e3f5
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:38:23.964Z'
    finished_at: '2026-08-29T09:46:42.961Z'
    artifact_digest: edc76bfac4c1afa1b3db6eb1fb3fafe3c0a0e91d325bd3160a70e053447c3a2a
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 498997
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 498997
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 498997
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 498997
  - version: kibi.verification-receipt.v2
    receipt_id: VR-681a8d575a569a13906581dc
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:08:52.115Z'
    finished_at: '2026-08-29T10:17:27.277Z'
    artifact_digest: 7a8d4ae144caf08ac4257e23f82d50e45a3f8ebc3f1b9110b48ab926bf2d6fd1
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 515162
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 515162
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 515162
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 515162
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bf7b5236b09dc4e56605e1ec
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 4dcb52daacd2e6301cb225622dbda1c10a95ea1252b73faa3a34235c61fe9d71
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T11:20:09.937Z'
    finished_at: '2026-08-29T11:28:39.203Z'
    artifact_digest: a52867d809f1a83f523f6aa4a1418b7dde3aaf1286866d01a9abed07bbafcd17
    contract_hash: 974c93beee9ee76c06aba5714815029673cd0f234d2c4ce3ee5a383aa622e1bd
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 509266
      - symbol_id: SYM-packed-e2e-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 509266
      - symbol_id: SYM-proof-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 509266
      - symbol_id: SYM-shared-npm-cache-resolution
        project: default
        outcome: passed
        retries: 0
        duration_ms: 509266
---

The harness tests verify graceful signal-driven journal flush and replay,
shared interactive Prolog fixtures for ordinary behavior, exact CLI metadata
and lazy-loader parity, bounded root-suite concurrency and deterministic
summaries, shared packed installation setup, private engine runtime ownership,
and teardown before fixture deletion.

The full curated unit and packed E2E suites provide the integration evidence:
they must complete without leaked test-owned engines, isolation failures, or
contract drift across CLI and MCP surfaces.
