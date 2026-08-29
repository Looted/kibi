---
id: TEST-kibi-conservative-requirement-proof
title: Conservative requirement proof report tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - requirements
  - proof
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-CONSERVATIVE-20260810-01
    test_id: TEST-kibi-conservative-requirement-proof
    runner: bash
    command: swipl -q -g "load_test_files([]),run_tests,halt" -t halt packages/core/tests/kb.plt && bun test --timeout 15000 packages/cli/tests/commands/coverage.test.ts packages/cli/tests/commands/status.test.ts packages/cli/tests/operations/discovery.test.ts packages/cli/tests/operations/reporting.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/status.test.ts packages/mcp/tests/server/tools.test.ts
    scope: end_to_end
    outcome: passed
    code_snapshot: 3575856c125e0c295553661a049c7eafef56a740e5a03c667dbf6da4b5bea2d4
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T15:55:32.132Z'
    finished_at: '2026-08-10T15:56:09.566Z'
    artifact_digest: f4a6c9a83f1c333fda595f4a81fad506b07a8596d35218981fdd705ed5bc01d9
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-CONSERVATIVE-20260810-02
    test_id: TEST-kibi-conservative-requirement-proof
    runner: bash
    command: swipl -q -g "load_test_files([]),run_tests,halt" -t halt packages/core/tests/kb.plt && bun test --timeout 15000 packages/cli/tests/commands/coverage.test.ts packages/cli/tests/commands/status.test.ts packages/cli/tests/operations/discovery.test.ts packages/cli/tests/operations/reporting.test.ts packages/mcp/tests/tools/coverage.test.ts packages/mcp/tests/tools/status.test.ts packages/mcp/tests/server/tools.test.ts
    scope: end_to_end
    outcome: passed
    code_snapshot: ebcb72a6263ef4b2b7732572082d776c89b90085a1cf4c4ca440ba10fc30df11
    environment_hash: 6e6bbcb607fdce2e1a5d110e1105c16eb85b14725f9323fa0fa5b372428db14e
    started_at: '2026-08-10T16:10:54.711Z'
    finished_at: '2026-08-10T16:11:34.747Z'
    artifact_digest: 0988c8df2ed3a9f2682b1e5a1d67f8588c6d97774cf78eefc1e8a4e735cf8ee1
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6fb044a6eab0104d1de23ea5
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: failed
    code_snapshot: 3c7cf6857c6c8a0d059fecdeaa3fa28144954b375fb37d8a857f6c2919134711
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T18:57:34.657Z'
    finished_at: '2026-08-16T18:57:35.548Z'
    artifact_digest: 7a3a199f734f563b953c0840b68d9e47d025573e2af737950c9dead3b2fa636c
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: failed
        retries: 0
        duration_ms: 891
  - version: kibi.verification-receipt.v2
    receipt_id: VR-16c5b29a7f2505160bc202af
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: dbc757bfce932c33d6f4be44a7129ba4fdaabbff14d69010dac1da2029bcaefd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T18:58:50.928Z'
    finished_at: '2026-08-16T18:59:19.460Z'
    artifact_digest: 05ec8f8ea8075c7273570f3040c515bbcfd036428a16f6ca627e05791eb24f44
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28532
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bbc9fea734c85fc8b374fabc
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:18:20.386Z'
    finished_at: '2026-08-16T21:18:57.173Z'
    artifact_digest: 4d45112f941587f37cf8cc63977f37df7f1b59a06be2df540fd5564ca372cad6
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36787
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3163b408efd2430cabac12f0
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:44:20.224Z'
    finished_at: '2026-08-16T21:44:46.940Z'
    artifact_digest: c2c0eef513cac4173da529aaedae7002c15f58ec7ea8444aaf4c6f3f693f7e83
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 26716
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f7c294863522400f8ece49cf
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:06:41.820Z'
    finished_at: '2026-08-17T12:07:12.919Z'
    artifact_digest: b305434b4ebfae99c34c091c9d656e2ea8b9399562ca7b2cec074ca0ba0837f4
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31099
  - version: kibi.verification-receipt.v2
    receipt_id: VR-17d80e79783b026a2e41328a
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:57:00.410Z'
    finished_at: '2026-08-17T20:57:32.204Z'
    artifact_digest: 381f6b89b675b9ae0b7622b23e2b3ca5298b2f3c5e7d2e792bb2aeebb8b34ca6
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 31794
  - version: kibi.verification-receipt.v2
    receipt_id: VR-60c4f0a754d09dfe35c71ef8
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:11:16.275Z'
    finished_at: '2026-08-18T07:11:49.134Z'
    artifact_digest: b0aba8c5989b6b5d642487fc910ebffc9bae05b348d4540e145a6aea5305c21b
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 32859
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a8aba9a321489a8c62b4531e
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:39:44.869Z'
    finished_at: '2026-08-18T10:40:18.113Z'
    artifact_digest: 5be43a534b81b7283b002fddd00164647dfa99009baf0e4e3843f6ed8617da98
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33244
  - version: kibi.verification-receipt.v2
    receipt_id: VR-23a70a1f5afdb1a9d35ca82b
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:50:10.736Z'
    finished_at: '2026-08-21T21:50:57.337Z'
    artifact_digest: 7530ce85567334b49fa280f7d064e745f2bc612531fce7e5c41db8c8ec221c7c
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46601
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3c4cf795707ad22af36c76bc
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:05:36.987Z'
    finished_at: '2026-08-21T22:06:20.985Z'
    artifact_digest: bcbbd171e21d519237fd0d23c546bac315b7c8048eb4aaa77c3641212d0701c8
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43998
  - version: kibi.verification-receipt.v2
    receipt_id: VR-802929770ac636a3ce3b9f9b
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:55:19.141Z'
    finished_at: '2026-08-22T00:56:18.044Z'
    artifact_digest: d0bde96c63a6711e4e549ed8da9a4f8d25ef3843fd633e921d91a2edb18e7a8b
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 58903
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6de6cb36fa26d943520b8774
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:57:59.392Z'
    finished_at: '2026-08-22T07:58:43.447Z'
    artifact_digest: 5f480dd99df10791f95556342e533b6cf7ac33bca32e7260d4340a1039f0c851
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44055
  - version: kibi.verification-receipt.v2
    receipt_id: VR-723dd8040771c77b3b8b1bcc
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:46:14.717Z'
    finished_at: '2026-08-22T09:46:57.481Z'
    artifact_digest: a637fe04f8ba4bf66ee99e04b6992d4c3a395265b96e4b858def0324eb6492b7
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42764
  - version: kibi.verification-receipt.v2
    receipt_id: VR-420112f10391eab30d48cdb4
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:42:30.728Z'
    finished_at: '2026-08-22T12:43:06.446Z'
    artifact_digest: 6f170556c3871180af2f67c9c7bd7ea7eaf203aa9a8a2a756cbc8f62735e9367
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35718
  - version: kibi.verification-receipt.v2
    receipt_id: VR-35974fa5014bb3b75a72f041
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:04:15.447Z'
    finished_at: '2026-08-22T21:04:53.461Z'
    artifact_digest: 625ba0ee8668cd09bdaae032faf86655d1ab7c13d929830e1671a7da7ade822e
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38014
  - version: kibi.verification-receipt.v2
    receipt_id: VR-728b7d4656a07a838adc77e0
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:30:54.389Z'
    finished_at: '2026-08-22T21:31:33.055Z'
    artifact_digest: 1718502e5a7342e96f10b3d84d4cb55f7361acebf851be28cdb3b427a3ede213
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38666
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fbdb81d6c8d656584d102b2b
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:01:19.019Z'
    finished_at: '2026-08-22T22:01:54.596Z'
    artifact_digest: 3602d3d73f0a913af81fe7cbedc1ce9905a8af577ba421d6b484b22e4f14482c
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35577
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ccf7a2148f58ac56a983292b
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:31:12.511Z'
    finished_at: '2026-08-23T07:31:48.367Z'
    artifact_digest: 17a1a5a251dcb39064d7dc8e12e38d99b588df7c237ec27e882949776f960dee
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35856
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0d5bb7400377aa9d1dc0f9ac
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:14:49.659Z'
    finished_at: '2026-08-23T08:15:26.385Z'
    artifact_digest: 0b9200e5d5610f197d5e1c501b8e4a6b2d0e662f5dea101af55a4d379779da50
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36726
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8eca2954d3a825a8047df040
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:12:00.553Z'
    finished_at: '2026-08-23T12:12:35.412Z'
    artifact_digest: d2fe0bbd28cb700f0aca5d0d848adbe5e822200cea80389a9f4fbca7f1e4f062
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34859
  - version: kibi.verification-receipt.v2
    receipt_id: VR-79fe4bce4f34b751d147c74b
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:11:46.472Z'
    finished_at: '2026-08-23T19:12:22.538Z'
    artifact_digest: 393bc63da4c73f2bd6d2722a7f05428906dc835461bce1b10e6df8393dd610dc
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36066
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ffb3d8ad3bab5deb66606383
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:37:55.946Z'
    finished_at: '2026-08-23T19:38:32.500Z'
    artifact_digest: f915a286a69ca574365f676a9d08e4240afc3784cd2e3abf85cce07ea5c2ef14
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36554
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ecc2c42182fa1191f0c343c0
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:05:51.723Z'
    finished_at: '2026-08-23T20:06:28.132Z'
    artifact_digest: dff78b586370cd87ca9eee32137b3cae2851c0f12c639fa565b49de815c14168
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36409
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f2396517e69c6f8ca1106690
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:32:11.970Z'
    finished_at: '2026-08-23T20:32:47.232Z'
    artifact_digest: 2948cd107e1c20ad46531ad2447e91bb0f1b25640e5b9c71d25f4df6dd6e6981
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35262
  - version: kibi.verification-receipt.v2
    receipt_id: VR-70201b6570b242c33a413b0c
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:13:04.268Z'
    finished_at: '2026-08-23T22:13:38.834Z'
    artifact_digest: 7e3c53cf252d152d002d8c2b6f73f0149b91459e2c1ecd3c9aaa5e92daa08ff7
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34566
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4bbf9c9581c6bd9313373e92
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:39:14.367Z'
    finished_at: '2026-08-23T22:39:49.309Z'
    artifact_digest: 65cb2c71a69d9000fe56f26de635b3f01b85551aa28ae99ffa7be317436ff382
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34942
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6ab34a57fa592462f73dfa78
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:24:36.322Z'
    finished_at: '2026-08-24T06:25:16.830Z'
    artifact_digest: 9ef060175b2254f8b3aac557254423aa6ad8c3376593e1a98891f303a07e83f1
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40508
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b09a7cf23a7ae6055fa19960
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:52:38.751Z'
    finished_at: '2026-08-24T06:53:15.402Z'
    artifact_digest: f3de4e8e114b0e6e239a79ba6dc48685f43d12c2b75815f0e8c118b2cbb8807d
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36651
  - version: kibi.verification-receipt.v2
    receipt_id: VR-64b88ccee16195f8a3074c83
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:22:44.516Z'
    finished_at: '2026-08-24T07:23:20.046Z'
    artifact_digest: 0be560a0613e704aa65a91025d19dfc88350732138bf85dc462849c7c2acf781
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35530
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e6f9d4190a0173d7b11513f2
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:47:26.978Z'
    finished_at: '2026-08-24T07:48:05.563Z'
    artifact_digest: 249bab1250a283324bcbd7421d260d5d7c7b0132952328eaf510dd370a7066a3
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38585
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f649a8e67bcd3b7a7daab1c3
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:19:42.147Z'
    finished_at: '2026-08-24T08:20:23.391Z'
    artifact_digest: c15a1bbdd3c48935256fda8308bd0375c519ce3a606d27211694442295bc2963
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41244
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0fc4470aec3637d60d9b8bd3
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:49:09.245Z'
    finished_at: '2026-08-24T08:49:50.940Z'
    artifact_digest: 8fd34727b4f597785425730a687f9fcff88c3f2f1edc76ff210deb0777cfb9ba
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41695
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a4bc7a554dbdebadf405e17e
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:52:51.349Z'
    finished_at: '2026-08-25T20:53:26.520Z'
    artifact_digest: 2c449b090cf8eff9f9622092e186ae6052318beeb05ec86d6be12b0c1d5456e0
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35171
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d6a1359daa9e8909268dfb46
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:37:14.478Z'
    finished_at: '2026-08-25T21:37:48.363Z'
    artifact_digest: 6118423ea9f599b9b383f3d6064833d238ab03b1934fc4c6160a56fa3e5c440a
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33885
  - version: kibi.verification-receipt.v2
    receipt_id: VR-55e95333afd5ec3803bee186
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:24:04.153Z'
    finished_at: '2026-08-26T08:24:27.906Z'
    artifact_digest: cd501b3a5c1555f441c748af808987c59059a5c78bf22381c3cf0ec3f5c4d2ca
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23753
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f3baf1aa5833d9d840270a9f
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: e35a1f8939a4ceeaf12f0d56a7b28f32ca96a77ffd3e8913854c79790f2e2a29
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:21:47.567Z'
    finished_at: '2026-08-26T13:22:27.149Z'
    artifact_digest: aebe69c9744830c6fdbbf2e441fdc2da5b2bf47ce6bd014d1abbc817ad7b318d
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39582
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5de2beeb710d6e6a5ddd0cc3
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:39:32.295Z'
    finished_at: '2026-08-26T13:40:06.476Z'
    artifact_digest: 6fad1a50c14f322d2d1be8599e2db99a716c1482906ebff56c7020a28460da8f
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34181
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a06db29b615d3198ff1256e7
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:31:14.216Z'
    finished_at: '2026-08-26T15:31:52.702Z'
    artifact_digest: edacf3710fabd437f7ba241e2cf28ce54a191fe3ab2f9ff3ef278f4882159d96
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38486
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bd5eafaf93776991490a6e00
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:31:56.518Z'
    finished_at: '2026-08-26T16:32:33.441Z'
    artifact_digest: 1ff5f9f46da72d01ae5e8739db52e8a9c952761a1553713c6995f45790697943
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 36923
  - version: kibi.verification-receipt.v2
    receipt_id: VR-09d3db5e621f2fbdaaa887f8
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T12:59:17.575Z'
    finished_at: '2026-08-28T12:59:39.150Z'
    artifact_digest: 67f9aa08daeebc14011a3e1ffb94174a456493c1b5474d80e2d3e6610353d615
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21575
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8089690de0c22fcfa888aa4a
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:48:44.649Z'
    finished_at: '2026-08-28T13:49:18.308Z'
    artifact_digest: 2ababdd63e0cdad8d34592191c54b267022bc6c4db4ce7931d1cf39da4992c4b
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33659
  - version: kibi.verification-receipt.v2
    receipt_id: VR-324316e3c9f049696a1b8e9f
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:32:29.036Z'
    finished_at: '2026-08-29T01:33:02.308Z'
    artifact_digest: 4bcfb04aa427861cb5c59e3a8c8ed33d57710600cae266ca0545b6ee2aed9e61
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 33272
  - version: kibi.verification-receipt.v2
    receipt_id: VR-18e8b9cd6122b23006cfffd1
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:48:29.097Z'
    finished_at: '2026-08-29T07:48:52.493Z'
    artifact_digest: 843b0e5ac000c40ef042737963e89ee88ddedec70b0bce6569be1828c5316121
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23396
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d1e8db926089b57a29a0817d
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:17:35.689Z'
    finished_at: '2026-08-29T08:17:58.681Z'
    artifact_digest: 7415e0fcdc5149e02a02430bc1ba705ca40f45119e6c8af79759d85351076757
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22992
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4b131ce46833b8e8149ea5f7
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:48:58.397Z'
    finished_at: '2026-08-29T08:49:21.827Z'
    artifact_digest: 80cabe114789764d14dc716a0a919e2caefadf38f9c619d6465b6f071f2a9288
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23430
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f694da203386ba257f40c93d
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:37:59.512Z'
    finished_at: '2026-08-29T09:38:20.296Z'
    artifact_digest: 4aaf93be2de1411c7a0a7bacbcf2bef32a23981fad07bbaca713ca9f3bd54196
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20784
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5885aa7dd4eadc5126d68db0
    test_id: TEST-kibi-conservative-requirement-proof
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-conservative-requirement-proof
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-conservative-requirement-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:08:24.882Z'
    finished_at: '2026-08-29T10:08:48.326Z'
    artifact_digest: e0aa798764a876616b42cad65b1e0a886d1162f52a43901b269ad60df14b404b
    contract_hash: 5b768b87a0fd1fc6d2971d082e9a22507a107f32b139249e4257e2136f6a7985
    case_results:
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23444
links:
  - type: validates
    target: SCEN-kibi-conservative-requirement-proof
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-conservative-requirement-proof
  required_case_symbols:
    - SYM-test-conservative-requirement-proof-chain
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Verifies the conservative requirement-proof contract through core Prolog, the CLI command surface, and the MCP adapter. It covers structural false positives, complete proof chains, semantic-inventory RDF round trips, refresh-before-extract source-coordinate persistence, executable-versus-production symbol classification, stable proof gaps, ranked repairs, and compatibility of existing coverage fields.
