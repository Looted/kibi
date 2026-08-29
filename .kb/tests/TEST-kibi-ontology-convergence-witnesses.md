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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4b528f405edb2ede6f356c2e
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
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:34:24.502Z'
    finished_at: '2026-08-23T07:34:35.162Z'
    artifact_digest: 9a6e27c380c7fa06fbec88f3e1e9e6b67a2d7b389b016a157c94b7082d202ebd
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10660
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5302f950c838a4804e2f27bb
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
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:17:58.677Z'
    finished_at: '2026-08-23T08:18:08.802Z'
    artifact_digest: 1be1e9f7b4ed7bf0abc32d86286a665d0f2f72fde3ecf57d9664ea123d0b7a80
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10125
  - version: kibi.verification-receipt.v2
    receipt_id: VR-685fc07677bc27cc489b69eb
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
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:15:02.242Z'
    finished_at: '2026-08-23T12:15:12.217Z'
    artifact_digest: ca91448ee91b29f77e52192a478eced13d430ab00c304bbf8563372e65cf1e54
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9975
  - version: kibi.verification-receipt.v2
    receipt_id: VR-569593550b9359543efad9ce
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
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:15:00.552Z'
    finished_at: '2026-08-23T19:15:10.250Z'
    artifact_digest: 840e08e935b53832b588d25f9d88efe560f9135cd162a2ce0e77cbe1ecf8647d
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9698
  - version: kibi.verification-receipt.v2
    receipt_id: VR-180892f0378d997935c39395
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
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:41:08.990Z'
    finished_at: '2026-08-23T19:41:19.174Z'
    artifact_digest: 32af49fbb9b7f4f5e102bf2a4f161b6fefd892ef0b95ce84aefd12e80a076d9e
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10184
  - version: kibi.verification-receipt.v2
    receipt_id: VR-56336915e463b1be7f8b368c
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
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:08:59.502Z'
    finished_at: '2026-08-23T20:09:09.185Z'
    artifact_digest: c620928c1232433e058787e1ad7c5441e66d9d1e5beadf375f3915fbc6d312f4
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9683
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e13f3aa3d90095fb06a924e5
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
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:35:17.484Z'
    finished_at: '2026-08-23T20:35:27.376Z'
    artifact_digest: bc684fe65c5df6eb18595386d400e80cc4997bf2d096b0e285a863672b799c50
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9892
  - version: kibi.verification-receipt.v2
    receipt_id: VR-727892e70a433ed0bde51e47
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
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:16:03.034Z'
    finished_at: '2026-08-23T22:16:12.500Z'
    artifact_digest: 21a7e7228cb1f255b8f454d3526464cc3179af82a030ec474b7808c9bf8adf9a
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9466
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dd02571382ce106814646373
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
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:42:14.494Z'
    finished_at: '2026-08-23T22:42:23.870Z'
    artifact_digest: 21e1fc67bae3f25d0df619593e1b5ea11e61bd7680a67eeb2c99cdf2e763779e
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9376
  - version: kibi.verification-receipt.v2
    receipt_id: VR-67240b7d5346f925392be1d5
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
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:28:04.607Z'
    finished_at: '2026-08-24T06:28:14.627Z'
    artifact_digest: 3f3e530f32365266115479dd834927413ea733ccd3d7634641c1e2dc3cf204af
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10020
  - version: kibi.verification-receipt.v2
    receipt_id: VR-29a2a8a4ff98005b2a892d82
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
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:56:11.155Z'
    finished_at: '2026-08-24T06:56:22.531Z'
    artifact_digest: 5c4e3342b3e7270d13961fbf4fc1517451db5b2c64ec8a21575125a94f4ca372
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11376
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2185b3061c71ed8750fc1df3
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:26:03.021Z'
    finished_at: '2026-08-24T07:26:13.137Z'
    artifact_digest: e0a173c93574c13c01b0aaf7a4837deaf774daf6f09ef717944de26e7dff74f2
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10116
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5130933a714b190223f8c0fe
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
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:50:44.964Z'
    finished_at: '2026-08-24T07:50:55.984Z'
    artifact_digest: abc28eb31a4b7979bd0b0bded971f47810b40995595c2f5ade674b138db7eb39
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11020
  - version: kibi.verification-receipt.v2
    receipt_id: VR-24950a3b07f12ef95d67c5e1
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
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:23:10.864Z'
    finished_at: '2026-08-24T08:23:21.401Z'
    artifact_digest: 92a073e7a325c8ea8ccd9bc1d89c9ab27ae7cfa60d1091817b9b6cee144e0cbd
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10537
  - version: kibi.verification-receipt.v2
    receipt_id: VR-092eadbde352cad309e053d1
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
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:53:06.428Z'
    finished_at: '2026-08-24T08:53:21.701Z'
    artifact_digest: b76f73b3e957cd0bb93419bf5d42b68049fd95498dfb59dfc9c9cbfaabdce5e2
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15273
  - version: kibi.verification-receipt.v2
    receipt_id: VR-883467be6f4419c37c688f62
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
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:56:05.980Z'
    finished_at: '2026-08-25T20:56:16.111Z'
    artifact_digest: 1ec9f02dfb02e2f44b79ae073f53831fc8a683479b7b123ffe7a5a50f92ee49d
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10131
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7b54a105d722af91f198ebf2
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
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:46:05.944Z'
    finished_at: '2026-08-25T21:47:10.854Z'
    artifact_digest: 2bdfae48b145800b3a36de700ccf7a61046273d2c89dd6c69ee03b3dcf0639b4
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 64910
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b4efad2b0d7bf7b38987cb94
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
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:30:03.742Z'
    finished_at: '2026-08-26T08:30:56.906Z'
    artifact_digest: 4672408bb4dde418ce788082f3037fc7a8d4702e0168b85111b4950bfe3e81fc
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53164
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5eb50ff151794054e479227a
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
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:48:56.122Z'
    finished_at: '2026-08-26T13:50:06.819Z'
    artifact_digest: 25d617eb4d4319cc4244d7c6b2e2bb65bc46ca82e78d5e868ce038d90955150b
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70697
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4204770090700d073a9875d8
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
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:40:52.646Z'
    finished_at: '2026-08-26T15:42:14.904Z'
    artifact_digest: 3a6be1444dfbf51b9501c9a63ff04e48ecae0e5403e30d7dfa5314e37b97fa15
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 82258
  - version: kibi.verification-receipt.v2
    receipt_id: VR-147dda0a2c9d624e9a4dd9cb
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
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:41:51.284Z'
    finished_at: '2026-08-26T16:43:08.625Z'
    artifact_digest: 3a41a16e7333afa347701ba53c6c27094392e783a58a69be7fca9224fb13490a
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 77341
  - version: kibi.verification-receipt.v2
    receipt_id: VR-83206f594c3f4a31a3a14a18
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
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:27:48.984Z'
    finished_at: '2026-08-28T10:29:00.969Z'
    artifact_digest: f433ce5a05d972f7346579da5de827ad96705209e2736e5069e83e5484fe30b6
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71985
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6ed0b55abcd743f01b668101
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
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:35:02.746Z'
    finished_at: '2026-08-28T13:36:04.526Z'
    artifact_digest: 4c6b594e3e4ec540abd05577c6eafbfc21c00c664b81e9084e40f3859956cf7f
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 61780
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a574011e65b6ae23c0586fc3
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
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:18:54.752Z'
    finished_at: '2026-08-29T01:19:57.423Z'
    artifact_digest: b45e640be0e7af07993d486d02fd365ea249a78753285184eeff4b04db7eeed0
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 62671
  - version: kibi.verification-receipt.v2
    receipt_id: VR-85cb1e3816466f515d4f0dbc
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
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:39:45.303Z'
    finished_at: '2026-08-29T07:40:23.321Z'
    artifact_digest: d2325af4bd9f8c6d407dcda87b546a4e07829f85899449a5d5049cdf9027d50c
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 38018
  - version: kibi.verification-receipt.v2
    receipt_id: VR-68d62d5c9d377887afa900b9
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
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:08:38.004Z'
    finished_at: '2026-08-29T08:09:18.073Z'
    artifact_digest: fb00d725845ffb5a4f1e0f05b0cfe09931f08dbb617a785aedb01ff2668ce65e
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40069
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9bce89f2a49d969a312b6229
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
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:40:14.219Z'
    finished_at: '2026-08-29T08:40:53.591Z'
    artifact_digest: 57c3ff2756f0319b2f64ab3ac3d66a8cf521574d376b845b79160a62eaf63cf1
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39372
  - version: kibi.verification-receipt.v2
    receipt_id: VR-14437d84cd42065281274a13
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
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:29:25.203Z'
    finished_at: '2026-08-29T09:30:04.367Z'
    artifact_digest: 7d3df2569b9d6f19eee96a1790b367b36f538ffd61420014d30d88918252ef51
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39164
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3e398adb0e4567f211c883f0
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
    code_snapshot: 802b5d58ebedd99d952c8baca270c08e187b9d0a2eb556bb99f7e1d776045487
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:59:35.495Z'
    finished_at: '2026-08-29T10:00:15.417Z'
    artifact_digest: 6e735e88e75ed7f479412abaed97e7f35a771496c6da280c264fa0727fda46c1
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39922
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a41141ab55d2d19a68310cb1
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
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:39:12.214Z'
    finished_at: '2026-08-29T10:39:54.932Z'
    artifact_digest: 2d702c63ef4a775433339213788bc2195ad146359b3e42c76c68a64a9d5517e6
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42718
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
