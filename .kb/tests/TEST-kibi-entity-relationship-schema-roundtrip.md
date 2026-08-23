---
title: Entity and typed relationship schema round-trip
status: active
priority: must
tags:
  - cli
  - e2e
  - schema
  - relationships
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: REQ-004
  - type: validates
    target: REQ-005
  - type: validates
    target: SCEN-kibi-entity-relationship-schema-roundtrip
id: TEST-kibi-entity-relationship-schema-roundtrip
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-entity-relationship-schema-roundtrip
  required_case_symbols:
    - SYM-test-packed-eight-entity-schema-roundtrip
    - SYM-test-packed-typed-relationship-roundtrip
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1fc4452baa29a26465c11a4d
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fcb38ac8aedffbedf4b6a52c8e28b46ff79eb712af662445ed58452b538c3e4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T19:09:04.858Z'
    finished_at: '2026-08-17T19:09:57.977Z'
    artifact_digest: 4d0df3683c840374f86321f1c633c6b3ec733a514b43d91f710dac8731832f95
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: failed
        retries: 0
        duration_ms: 53119
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: failed
        retries: 0
        duration_ms: 53119
  - version: kibi.verification-receipt.v2
    receipt_id: VR-25460626d9ceb00c11ad7830
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 12ef6da62e45d998a2f489133906f6fe7818382c717c9f38d509813834a2f200
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T19:13:54.657Z'
    finished_at: '2026-08-17T19:14:48.191Z'
    artifact_digest: 5b1e194caac2ce01617e0446b94ffd7683b135c8a6a3272d9d7d6437a549304d
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53534
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53534
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed6cdfcbe43548690788d6e0
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:02:02.245Z'
    finished_at: '2026-08-17T21:02:55.949Z'
    artifact_digest: 4ea784dab1a498ded3ea634ffa94335abc2565284d2ebe5686a19aca4e55df29
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53704
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ee5c0b1901ff9325aaa1e5bb
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:16:36.598Z'
    finished_at: '2026-08-18T07:17:33.192Z'
    artifact_digest: 5df04aff5f7d7f7df61fba2fd73b0f8254687c339fa62f835acf09c6bc2d5213
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 56594
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 56594
  - version: kibi.verification-receipt.v2
    receipt_id: VR-29e78e77968f3de87a5712f7
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:34:58.718Z'
    finished_at: '2026-08-18T10:35:58.612Z'
    artifact_digest: 340367aa4968cf1f575fed07474ddd24be7fd18e5c2a058f774072328dab9efc
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 59894
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 59894
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eb2f1710f820c71b5deca762
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:53:34.544Z'
    finished_at: '2026-08-21T21:54:02.680Z'
    artifact_digest: 25693cf678013df799f2b2fe33f456ff85b79bb5c23d43db83034ad401cde136
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28136
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28136
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1ebd39939204c1ed14094b10
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:08:58.043Z'
    finished_at: '2026-08-21T22:09:25.431Z'
    artifact_digest: 210db9cef5bbb6a58085a137b1c07ce8f2209f5c68f914cf4904af79f3919166
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 27388
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 27388
  - version: kibi.verification-receipt.v2
    receipt_id: VR-74a53270c3de0bdff368f094
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:59:47.759Z'
    finished_at: '2026-08-22T01:00:22.547Z'
    artifact_digest: 591ff0059e005ace90267fe8a6cf1aaad853fc7b3e887dace4fbdf99f40b3d3b
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34788
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 34788
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4117d75bb6d806a921586f33
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:01:24.975Z'
    finished_at: '2026-08-22T08:01:53.108Z'
    artifact_digest: 075b613236ec6387a954dc8e42f104880b2178a825086637451ce9318c1b3318
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28133
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 28133
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b08bed66c105415ef334b30f
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:49:30.122Z'
    finished_at: '2026-08-22T09:50:13.310Z'
    artifact_digest: c7b365ff31859b1774b3859a50c498d9ae57954322b3ae06d782d4ef1708c365
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43188
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43188
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e26d0cf5ccb971e60b401902
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:45:12.711Z'
    finished_at: '2026-08-22T12:45:36.650Z'
    artifact_digest: 4c9602996a37fc5a39b7f2e7f7176169fe3c63a629fe1b49731458ecbd2dad56
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23939
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23939
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b49612f3d68fd2d138df33bf
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:07:06.488Z'
    finished_at: '2026-08-22T21:07:31.212Z'
    artifact_digest: 0135952637345eba14c5a2c3a25ea8679e953c48e3f1d457224509c6c8ef3aa8
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24724
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24724
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ea34c4f573523f11965d4728
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:33:56.948Z'
    finished_at: '2026-08-22T21:34:21.730Z'
    artifact_digest: 2652873f1536aae5c7b1a0b0a0417b11718aa23ef3872131186e0c7b361304f9
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24782
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24782
  - version: kibi.verification-receipt.v2
    receipt_id: VR-051b1133aeaf0a2357326b06
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:03:55.253Z'
    finished_at: '2026-08-22T22:04:19.219Z'
    artifact_digest: 13da906fb7d2c056ad6f99693430af4a9ab9a8c8f620e308a9ec7aba7e0d67f2
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23966
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23966
  - version: kibi.verification-receipt.v2
    receipt_id: VR-845b40cf55dcaa2f1986d202
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:33:54.373Z'
    finished_at: '2026-08-23T07:34:18.700Z'
    artifact_digest: 68f8c3dffeb1b652b313fae19ec7234c12f34186679d3990012f286091f659d0
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24327
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24327
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5728e43df1f3e6c9e393f1fd
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:17:29.497Z'
    finished_at: '2026-08-23T08:17:53.472Z'
    artifact_digest: 99ece292622e163fb10f8d70a16d3be0779245ec944df4f24545471a77c3409f
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23975
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 23975
---

Asserts that:
- all canonical entity types (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, and `fact`) are present and queryable
- unsupported types are rejected at query time
- required fields are persisted with canonical timestamps and source provenance
- typed relationships are stored and reloaded with provenance from a fresh CLI process

