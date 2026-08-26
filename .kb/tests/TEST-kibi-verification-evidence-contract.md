---
id: TEST-kibi-verification-evidence-contract
title: End-to-end verification receipt contract
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: documentation/tests/TEST-kibi-verification-evidence-contract.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - verification
  - e2e
  - playwright
  - receipts
  - proof
  - test
links:
  - type: validates
    target: SCEN-kibi-verification-evidence-contract
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-verification-evidence-contract
  required_case_symbols:
    - SYM-test-packed-fresh-verification-receipts
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b73ddf34f1be93571d904fcc
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:17:42.775Z'
    finished_at: '2026-08-16T19:18:30.563Z'
    artifact_digest: 593d712c8312283709bc5027a57c8b2dc8e63d81e7d5045b2616234bd9494e8c
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47788
  - version: kibi.verification-receipt.v2
    receipt_id: VR-962dc76ce447f822445cae18
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:26:12.122Z'
    finished_at: '2026-08-16T21:27:15.829Z'
    artifact_digest: 94893f5db6c7661e4745afbc81fb8e2acdaa62f9db02ed0ac8c11d30d03ea552
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 63707
  - version: kibi.verification-receipt.v2
    receipt_id: VR-625f019df25f71584f7c308e
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:51:47.815Z'
    finished_at: '2026-08-16T21:52:30.956Z'
    artifact_digest: 7ad5432659935910606e4c5086b5ca6f04d8d7cb346c1b144bef017f1f90913d
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43141
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d69315f630d36120d0c9558e
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:13:26.815Z'
    finished_at: '2026-08-17T12:14:06.939Z'
    artifact_digest: 25826a00b37253261999f1f7c547c9fbf63aeff348508f1d92bb76327f953cdf
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40124
  - version: kibi.verification-receipt.v2
    receipt_id: VR-82cf6ede87380e165feec826
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:05:53.370Z'
    finished_at: '2026-08-17T21:06:34.874Z'
    artifact_digest: 2e368e69a9a5724109489fb3c8db8d81dad1a50db7e6193bc207b47b5f3fba83
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41504
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8e9b312240bdce5f3d96913e
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:20:40.460Z'
    finished_at: '2026-08-18T07:21:24.607Z'
    artifact_digest: 45fe23b0a21e3b4928712ac80028e5b290ea9bf48c223523c7f8c1363f61bb59
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44147
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c1ec4de32eded7ba7b3ce825
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:48:23.344Z'
    finished_at: '2026-08-18T10:49:07.722Z'
    artifact_digest: 64b15c9d36c0d55393450dbe872f80a55cad866863d4aba3311411cd2485cb3c
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44378
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d28506f4ff832cf365185ea6
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:55:20.247Z'
    finished_at: '2026-08-21T21:55:35.553Z'
    artifact_digest: 4cd72deacc534290b87ad46c075d7ba8ceafaacdc2455cf546bd2567102b37ce
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15306
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc0ddb8733997be148e33e7f
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:10:42.579Z'
    finished_at: '2026-08-21T22:10:57.009Z'
    artifact_digest: 441f41fad29312a8bd5c1635105e49497a3b69f4bb4cac0dcedbe963b34080a6
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14430
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7662cb8c13dca5f6a8cff7f3
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:02:03.613Z'
    finished_at: '2026-08-22T01:02:21.557Z'
    artifact_digest: d0fa8d94a8c9c9b7a5c75eaa20376ecce7db660ba1437f3d2a08a4322f3d0c47
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17944
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e9403ce8468e9263f8991307
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:03:12.906Z'
    finished_at: '2026-08-22T08:03:28.061Z'
    artifact_digest: ba67dfd630ba34ce5b03d3673f8d73793cf8d67431b9eb0cbe835942bc0271fa
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 15155
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8954c6622cbbc686ce7bedab
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:51:31.254Z'
    finished_at: '2026-08-22T09:51:47.350Z'
    artifact_digest: 330db664133523ecd96070366092c774675f5a712ade5e41f06b456f17abd2c2
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 16096
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2b93a23785d9fafb16a61b81
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:46:33.865Z'
    finished_at: '2026-08-22T12:46:45.445Z'
    artifact_digest: 0b8e753c83faa0a69d25618e3ca952b5680245ed82a2b6025cfeb5a4134e3f29
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11580
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fdb467d532f7624ed95dc42d
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:08:30.994Z'
    finished_at: '2026-08-22T21:08:42.018Z'
    artifact_digest: fef2bd8bcdf78f96e1e36397bb922cdf64ccd5b3ca8bd591d877287524441731
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11024
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b8e99c1096107b6fedc6903a
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:35:34.037Z'
    finished_at: '2026-08-22T21:35:46.351Z'
    artifact_digest: bdf9484ca4e5260a58d9f04bf23f92f8e6e584de4fd52d9ef1addb3b19159362
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12314
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4611f68f0d5a131307c89e9b
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:05:16.027Z'
    finished_at: '2026-08-22T22:05:26.883Z'
    artifact_digest: cad4c041dd8872ffc46177fe559b6d409f777d55dd7554c5496f0cacf6f1ae66
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10856
  - version: kibi.verification-receipt.v2
    receipt_id: VR-74fe6551fb5bc7dc3c4d827b
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:35:19.995Z'
    finished_at: '2026-08-23T07:35:31.533Z'
    artifact_digest: 5484f5a945ab2c663a99ed5f4c4991941a5dad445f18a26056fcc1095e037e81
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11538
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c126b4e1fcc105a98e5edb02
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:18:51.468Z'
    finished_at: '2026-08-23T08:19:03.093Z'
    artifact_digest: d5c2d2a15f44c4c41356f311d5871c7da59783d468c01bc02c38c14dc2f1fa71
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11625
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d821c49179eaf81b4f0bb007
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:15:53.516Z'
    finished_at: '2026-08-23T12:16:05.193Z'
    artifact_digest: 100fe4b97ef2ebceef06c313417c8a829a0a74fc9664aa0f5ce03f13e73d0518
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11677
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e4421a239535e5eaef013d3b
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:15:52.622Z'
    finished_at: '2026-08-23T19:16:04.923Z'
    artifact_digest: 36f9235fcdf90fbc1647176d35ec1376b1c0466e0124207586fbba85d2b7cdb4
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12301
  - version: kibi.verification-receipt.v2
    receipt_id: VR-031abd8a18ce6c09ba945fac
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:42:02.414Z'
    finished_at: '2026-08-23T19:42:14.312Z'
    artifact_digest: c5c22e8b0cbe897836c3dc27ecb97c8267bb3300f71ec01e9cdfb5ef3641ead2
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11898
  - version: kibi.verification-receipt.v2
    receipt_id: VR-88da6984b073f044a88687be
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:09:50.849Z'
    finished_at: '2026-08-23T20:10:02.631Z'
    artifact_digest: f53763e15890eccf62ed2b04bc9a969d860fe6d8b75bfc1aaca947a667e49e01
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11782
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bf7e3929516e34b068c676dd
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:36:08.910Z'
    finished_at: '2026-08-23T20:36:20.981Z'
    artifact_digest: f4b19ea95a1cac8ca9eb7ff204c27c4c9259ecf336a9fba215db7da66868502f
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12071
  - version: kibi.verification-receipt.v2
    receipt_id: VR-07c51d5cbf079296528d55ab
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:16:52.168Z'
    finished_at: '2026-08-23T22:17:03.318Z'
    artifact_digest: 9bd84e6d2219806ea1bf3b96578678829b6ada52b033ad6e04e5c0e0a4ccca4b
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11150
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3be8afc5313cdf5ea8da8980
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:43:04.165Z'
    finished_at: '2026-08-23T22:43:15.707Z'
    artifact_digest: 2051aacd1fc065de19cc6b5d834367f8504a46ccf0105fb70f49d65a7e070e3f
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11542
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e9dec2d3ab48c829e1d8f65c
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:28:59.151Z'
    finished_at: '2026-08-24T06:29:11.171Z'
    artifact_digest: 6b0a602eaa50573f5f5ba858e756b7947e76beb0cee7ed4e9737c8e25354bf1b
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12020
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cf5fe2d2393394270ec393d9
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:57:08.575Z'
    finished_at: '2026-08-24T06:57:21.508Z'
    artifact_digest: 67260ef107030d8b589484cd5fb9d2a1bbd0b2cc5b653c7fbb36aa3c7a806845
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12933
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0db54fead9a7ae45547427aa
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:26:58.332Z'
    finished_at: '2026-08-24T07:27:10.357Z'
    artifact_digest: 9713c417aaf0397e4b3a99dd092588d156394652b1dce55e9cbdcfa46412deb8
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12025
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5e4d0cc479048b48cc843735
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:51:47.072Z'
    finished_at: '2026-08-24T07:51:59.437Z'
    artifact_digest: 5189ced72b1ac6b5c2ae282490d7f758474c5062f641cbb818209e9e27c73641
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12365
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d732de803a96e4c4cc01c784
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:24:04.985Z'
    finished_at: '2026-08-24T08:24:16.791Z'
    artifact_digest: f1a5f026013f2fea1988c605278f52198b5ca7d6cf493b9df4cda741bfafaf83
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11806
  - version: kibi.verification-receipt.v2
    receipt_id: VR-03ea295dc747ce64c5fa5af8
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:54:15.699Z'
    finished_at: '2026-08-24T08:54:29.126Z'
    artifact_digest: 3e7701b472b546928685b328055525d0c4965da2873a434f1760127dcfaac27e
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13427
  - version: kibi.verification-receipt.v2
    receipt_id: VR-33101a044787b8bc2b0d5bf5
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:56:58.276Z'
    finished_at: '2026-08-25T20:57:10.123Z'
    artifact_digest: 2b1760a7ef615e3380c24f351d8f51c067c8d7b41345f7b13e098ec572af8a0b
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11847
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4bf07d24a62685e584895124
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:50:37.203Z'
    finished_at: '2026-08-25T21:51:49.899Z'
    artifact_digest: 85d1190986529f51143350a2c7a7eebd74ce77cc8a7aa4948dd040aae8113a89
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 72696
  - version: kibi.verification-receipt.v2
    receipt_id: VR-444276f80ff85f90086279ce
    test_id: TEST-kibi-verification-evidence-contract
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-verification-evidence-contract
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:33:24.027Z'
    finished_at: '2026-08-26T08:34:12.783Z'
    artifact_digest: 851111caa9ef8a3bded8be0c4c75dca924212193f1787b7d30784de34f7eb1d3
    contract_hash: c40f5a8fa17d333c96838383091b2c2b85d3cdf8ef9f32a46eba32a3f903ef2c
    case_results:
      - symbol_id: SYM-test-packed-fresh-verification-receipts
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48756
---

Receipt and reporter tests verify stable case IDs, contract and snapshot binding, append-only history across contract evolution, exact argv capture, first-attempt proof semantics, and rejection of stale, skipped, retried, partial, or mismatched runs. Earlier-contract receipts remain immutable audit evidence, while only a receipt for the current contract and snapshot contributes proof.
