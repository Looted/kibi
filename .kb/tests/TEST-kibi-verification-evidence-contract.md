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
---

Receipt and reporter tests verify stable case IDs, contract and snapshot binding, append-only history across contract evolution, exact argv capture, first-attempt proof semantics, and rejection of stale, skipped, retried, partial, or mismatched runs. Earlier-contract receipts remain immutable audit evidence, while only a receipt for the current contract and snapshot contributes proof.
