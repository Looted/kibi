---
id: TEST-kibi-ontology-convergence-witnesses
title: Packed ontology convergence and contradiction witness tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-ontology-convergence-witnesses.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-ONTOLOGY-20260810-01
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/ontology-convergence-witnesses.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: f2a4a4edb0cd96fbe56fe3dbfe87dba7834eff383fb5f103434ff3425509e1ba
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: '2026-08-10T17:06:26.692Z'
    finished_at: '2026-08-10T17:07:04.810Z'
    artifact_digest: 9fea046443ccc239c2f6f05022356518528f9a0af837b58564a429647e1b09de
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-ONTOLOGY-20260810-02
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/ontology-convergence-witnesses.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: c8dd61fb1d8da0075bb9676a56d19ce167b0e84b60f38be77528138ec67c1cc3
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: '2026-08-10T17:42:10.048Z'
    finished_at: '2026-08-10T17:42:38.864Z'
    artifact_digest: 6daad591a29bc2c41c1773f35db9105adc0f442c2cde95fb3246d85e9d45d2da
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9eaa5ec7f58d7e7afe508e4a
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:12:39.976Z'
    finished_at: '2026-08-16T19:13:30.168Z'
    artifact_digest: 52aa48631da3e55df0384e1c985c46d1b47c30bba204c9caee052a6939b8e088
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 50192
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5723f74ce53d44c1b2de8a91
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:13:31.034Z'
    finished_at: '2026-08-16T19:14:19.351Z'
    artifact_digest: 5a0c62753f0ec7f9992e404b6e3b92a522eb8acbf39652e45a5a77427857fcef
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48317
  - version: kibi.verification-receipt.v2
    receipt_id: VR-99e2b35f387b7e44682c718a
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:23:03.467Z'
    finished_at: '2026-08-16T21:23:44.358Z'
    artifact_digest: 97f7c372b93af3fd82dad587b923e1c7df54cd0063780c161ded423f970d8cf2
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40891
  - version: kibi.verification-receipt.v2
    receipt_id: VR-919e55a66d34e94900558143
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:48:41.459Z'
    finished_at: '2026-08-16T21:49:23.646Z'
    artifact_digest: 4a90b9b5ff5ce8817f5d5014bbd51fcab8daa54154a0e9becdf4ae557ac51d41
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42187
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9d02655d5f76d630379ce1a2
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:10:43.232Z'
    finished_at: '2026-08-17T12:11:21.762Z'
    artifact_digest: d07b8f28fbc785d4f1d854abfff7fc17b7d6a11654b6cee00040c314a46ce8f9
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38530
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bee721c7115588c67dae7367
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:03:00.729Z'
    finished_at: '2026-08-17T21:03:41.536Z'
    artifact_digest: 25f94bd021e7194f4d817a0923a26d889a4292a52bb17cd2f8700bcb12c8e86a
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40807
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e2dc9dc21128edd0553ae118
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:17:38.130Z'
    finished_at: '2026-08-18T07:18:20.954Z'
    artifact_digest: cfcd02caae0b2f7672b945a0259a9586f29d6b20ce53d64419e991a85ccbe132
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42824
  - version: kibi.verification-receipt.v2
    receipt_id: VR-59b255d71151e9d01699c9a6
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:45:14.505Z'
    finished_at: '2026-08-18T10:46:00.688Z'
    artifact_digest: 2808029594c23681d9a4e863079015856922373847b7c28978c550dc06ea77d7
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 46183
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2ca077d92553b5bbf2f1bd98
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:54:10.847Z'
    finished_at: '2026-08-21T21:54:23.216Z'
    artifact_digest: 87f2d2ab0205889cab82672407901800f28f5f43b84b5288d26866b01b679d39
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12369
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7a2599e1abdb292d5dbe5aa6
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:09:33.328Z'
    finished_at: '2026-08-21T22:09:46.538Z'
    artifact_digest: 8040f5050e2bce60797b06f742290741567d918ffcc221affe5f4e4876c78db6
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13210
  - version: kibi.verification-receipt.v2
    receipt_id: VR-256f5b04b8b4c00495afd6ea
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:00:33.092Z'
    finished_at: '2026-08-22T01:00:48.946Z'
    artifact_digest: 1a59a2b7cc4e53188a0c8d72c4de1a929f20639db1403a0b15245a5590aa3624
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15854
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d93902da738e06e9351ec016
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:02:01.686Z'
    finished_at: '2026-08-22T08:02:14.039Z'
    artifact_digest: 893467e7599410c6d22e773c023f4cfa14e31dcdf3aa5780594785b997fa79ba
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12353
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed45d6bb11b2160f58ed1afc
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:50:28.390Z'
    finished_at: '2026-08-22T09:50:41.125Z'
    artifact_digest: 4ed49b85cc7f0eff99277b9eaf68f6e64886de12e960768657df45dfb2384d21
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12735
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d3b0f78b0574e051e5b7eded
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:45:42.242Z'
    finished_at: '2026-08-22T12:45:52.028Z'
    artifact_digest: 4c066cd3de49e4764a4a29bd26507e51eaf9874792bb92d9e45e28cc3926f376
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9786
  - version: kibi.verification-receipt.v2
    receipt_id: VR-850518153bcd386f0fd3ce3c
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:07:35.774Z'
    finished_at: '2026-08-22T21:07:46.211Z'
    artifact_digest: eacc2f4961e20f23d6c633a3024cd3fcdbb67ad281c92f5cef90cd63c329532f
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10437
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b973d5270d68923f36bb626f
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:34:29.416Z'
    finished_at: '2026-08-22T21:34:41.687Z'
    artifact_digest: f71f2c0944af5a7c148296bf7f3396035e1fe6ed8019549daf5b64a506d088c8
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12271
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6a2c8f4339bb1c36ac5755f3
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:04:23.652Z'
    finished_at: '2026-08-22T22:04:33.869Z'
    artifact_digest: fa45238bf26bed24e73e2164c7f263b0e2b96b552b86164711b3833a1ffd0388
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10217
tags:
  - requirements
  - ontology
  - predicates
  - contradictions
  - witnesses
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-ontology-convergence-witnesses
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-ontology-convergence-witnesses
  required_case_symbols:
    - SYM-test-packed-ontology-convergence-witnesses
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises project-local schema discovery, exact schema and polarity selection, binding-plan withholding, and source-bound contradiction evidence through a packed CLI consumer installation. Core PLUnit coverage separately proves strict, predicate, contradictory-rule, and unresolved-rule witness semantics.
