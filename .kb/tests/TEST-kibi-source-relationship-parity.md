---
title: Packed authored-to-compiled relationship parity contract
status: active
priority: must
tags:
  - e2e
  - relationships
  - parity
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-source-relationship-parity
  required_case_symbols:
    - SYM-test-packed-source-relationship-parity
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-source-relationship-parity
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7525962e3b5cf39cd92e473e
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:04:23.112Z'
    finished_at: '2026-08-17T12:05:03.856Z'
    artifact_digest: 5e723fcd5b38267a9259699c91e8aa61cc0382d946674a3922895ac4aab23900
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40744
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1bdc19eef6f63ee3326dd448
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:54:26.660Z'
    finished_at: '2026-08-17T20:55:10.586Z'
    artifact_digest: 0670c882ba5c31b03323b4cd77ac3a66cb6d0859cbcf010b578dea5a2a5c5ba1
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43926
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e501c0d1d680b203ae8a0a1d
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:08:41.365Z'
    finished_at: '2026-08-18T07:09:26.329Z'
    artifact_digest: e2ce0285070fe6ba61cd80415d70eecc0f9f9f607c4a1aa97c6d9c43de700500
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44964
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc97ee12da22eca8f68c4b49
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:37:00.252Z'
    finished_at: '2026-08-18T10:37:45.405Z'
    artifact_digest: de45edca77e04cb9dda721334dc3a245533889b255e7a1d7319ec39b3b0d8efa
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45153
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8add652bd674911f92a5f1f3
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:48:54.124Z'
    finished_at: '2026-08-21T21:49:07.218Z'
    artifact_digest: 00e95bb939c26422514552df87ddb564fd2637d8957b61a6d9ae6e05930b1878
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13094
  - version: kibi.verification-receipt.v2
    receipt_id: VR-719bbf0166f174e3850b2ac7
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:04:19.532Z'
    finished_at: '2026-08-21T22:04:33.654Z'
    artifact_digest: a4b37ca53845665a534f496022f893aad53b30ddec3d3f7c531884dfa8a057a8
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14122
  - version: kibi.verification-receipt.v2
    receipt_id: VR-36dae82d893edeae15acdcb6
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:53:37.141Z'
    finished_at: '2026-08-22T00:53:54.823Z'
    artifact_digest: 3359d7192b9de8bdaabbd941837f7199f131f38d302074ce26423c5d2b5e0285
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 17682
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b8cbc0e88e53b166c6658a6a
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:56:43.009Z'
    finished_at: '2026-08-22T07:56:56.474Z'
    artifact_digest: ef81ce551f57b483f5a1139c6126f3699e0c2840a7247d88e1cdc0df4dc7c8bb
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13465
  - version: kibi.verification-receipt.v2
    receipt_id: VR-dcfc4fd034703046319c72fb
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:44:54.530Z'
    finished_at: '2026-08-22T09:45:07.291Z'
    artifact_digest: 3b15817d18b03861a28716796b08b6ab8866a07a6e6c4b2c3575fdbe2f51cf77
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12761
  - version: kibi.verification-receipt.v2
    receipt_id: VR-eacc6c3765915a3dca5dd6f8
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:41:31.711Z'
    finished_at: '2026-08-22T12:41:43.356Z'
    artifact_digest: ef3aeb1a0455419b9fd9ef1ca72867d169bdad93466c82c3671e6f53f513597b
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11645
  - version: kibi.verification-receipt.v2
    receipt_id: VR-533c72b8b534aa91e0f187de
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:03:13.771Z'
    finished_at: '2026-08-22T21:03:25.019Z'
    artifact_digest: 72f9faf760052ee61afa2a69cce2b9b0ba666c0d031e00f81fff699583b71631
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11248
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6e841c73e85594578c14e52c
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:29:40.137Z'
    finished_at: '2026-08-22T21:29:54.350Z'
    artifact_digest: 21d8c1f9b4e55a83bffa81429db05437ba301f1cc3a331a5bc79892107a0fe70
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 14213
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b2eb628ff17657b0d792df72
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:00:20.327Z'
    finished_at: '2026-08-22T22:00:30.750Z'
    artifact_digest: fdf11ab6d98d7c7caa30bd5bb70019e249b095c9151607c094a26b2610f19b89
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10423
  - version: kibi.verification-receipt.v2
    receipt_id: VR-72d196ff98c029ddf70b6577
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:30:13.535Z'
    finished_at: '2026-08-23T07:30:25.115Z'
    artifact_digest: 631d58720d0e7782baf7564a3ad5c6cdecc3e040df4fc862bfed9b47a15f725e
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11580
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a42fc4dfa49843c85d699c07
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:13:48.934Z'
    finished_at: '2026-08-23T08:14:00.529Z'
    artifact_digest: 07ba78fc1b771d6ca5b45430485296adebdae3e4ee6e4cb7075bb980958e4d10
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11595
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3357bb942c620e9c4bc0d311
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:11:02.922Z'
    finished_at: '2026-08-23T12:11:14.309Z'
    artifact_digest: 8f46cbb8534da6fb6df4401c35349f095d830251a7ef207fc9fc8c107aa16dde
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11387
  - version: kibi.verification-receipt.v2
    receipt_id: VR-194f1ce808b50d0e99bb7bff
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:10:46.614Z'
    finished_at: '2026-08-23T19:10:58.297Z'
    artifact_digest: c26053b76e79ea855cb432732a67283971d6d80d59ea9dc11264ebb999ceb34d
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11683
  - version: kibi.verification-receipt.v2
    receipt_id: VR-07090b56d8664bd3669c1b7d
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:36:55.511Z'
    finished_at: '2026-08-23T19:37:06.989Z'
    artifact_digest: 52b3d08f69854665c63271a41c494187781ea5e03f32ff46e372bef4e595e36c
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11478
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2479d07e1c29a5fd374d42ce
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:04:51.807Z'
    finished_at: '2026-08-23T20:05:03.377Z'
    artifact_digest: 02aa8c042b7264c56167af4d444c00646ec8000511e5b262d70c7e22d3419790
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11570
  - version: kibi.verification-receipt.v2
    receipt_id: VR-19b72121d1051d671a54ad8c
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:31:11.744Z'
    finished_at: '2026-08-23T20:31:23.258Z'
    artifact_digest: 86cab3383b92d367422646c8696321d52eff39424123e53a43e928ab8247c0f9
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11514
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bf6344cd571f47ca9fb42512
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:12:07.567Z'
    finished_at: '2026-08-23T22:12:18.872Z'
    artifact_digest: 1a6f2aa98abd27c46b6dcc9dfaf09a721e1b468c9ca4d8882875c76b833576f7
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11305
  - version: kibi.verification-receipt.v2
    receipt_id: VR-52e8d630e70c9ec5f5634789
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:38:16.827Z'
    finished_at: '2026-08-23T22:38:28.211Z'
    artifact_digest: 7ae6bcaec5bb814af140b2c378b8c96ffd7b2e6420c7b92fac1333c96907d10b
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11384
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e3c56e565d7f65a1f8ee4c95
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:23:30.493Z'
    finished_at: '2026-08-24T06:23:43.347Z'
    artifact_digest: 32948f27bcd3fffc9a6d052d743524db0b8d85f7486d5e8c011cc34bb1e8e58d
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12854
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7bb4bc1ff897b2194e627ec8
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:51:37.131Z'
    finished_at: '2026-08-24T06:51:48.711Z'
    artifact_digest: 2a66acacf91226e5f43441d480c1536a48a1199b92afc6be84fc1e3c7e3a2acd
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11580
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8553196ffd020eb122f64957
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:21:44.681Z'
    finished_at: '2026-08-24T07:21:56.670Z'
    artifact_digest: 93967d2abbaa80a069438029e81d2aade9b5c8d689514a1c706b6b97a53b1bf5
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11989
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f3426a26deb369d74cace527
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:46:10.993Z'
    finished_at: '2026-08-24T07:46:24.743Z'
    artifact_digest: bc475409f8ef5138d7d5e53507d2dc5042111984a68f7bc93f138cd8deadb483
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 13750
  - version: kibi.verification-receipt.v2
    receipt_id: VR-72a0baf5ef3beafe3de40df3
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:18:37.948Z'
    finished_at: '2026-08-24T08:18:50.123Z'
    artifact_digest: e2bf62ddc6a87414b878d196479e907c1d2c456f3ca5b15de3ab1d8a58fbee97
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12175
  - version: kibi.verification-receipt.v2
    receipt_id: VR-32142d28da4281d4e0c5847b
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:48:04.480Z'
    finished_at: '2026-08-24T08:48:16.634Z'
    artifact_digest: f7e7018351c5368c741e49d9720d0efb3d3e50ddd7a2d5f993cbbc58e054dfa4
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 12154
  - version: kibi.verification-receipt.v2
    receipt_id: VR-445455a782eb34d87c1cfd65
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:51:47.137Z'
    finished_at: '2026-08-25T20:51:59.041Z'
    artifact_digest: cbfb249568e0798345dc702ad785ab47c84faa24d41be5ab96d19f6aa0a7abf5
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 11904
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9a0595dcebc546d0de5b7dea
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:33:25.465Z'
    finished_at: '2026-08-25T21:34:36.800Z'
    artifact_digest: a672b8c9e88aa0bd2eb8945cdda840bdb45a36e85423999d0cf4da95149260ab
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71335
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f22279c7bed5aaf0cbdaa2a5
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 3fdd893432423d955d59eb93818a5204a36bb31e7d6ca858e7f4385011f22c6b
    environment_hash: 26d9b24eceb52c6dbe702e3b21046f44a7a733098ad375183f2971445dd5c831
    started_at: '2026-08-26T08:00:33.707Z'
    finished_at: '2026-08-26T08:01:56.891Z'
    artifact_digest: 110d380be45286b0d5004cfad84f66a39aac599b3ad3df3ea738f5844f11de4e
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 83184
  - version: kibi.verification-receipt.v2
    receipt_id: VR-14b352a8c257a1dbb43c460b
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 42e1675866533d230dd9c3801e6bf3f5f95a2ad1bd7a36a7a0f887fa9da75643
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:04:00.788Z'
    finished_at: '2026-08-26T08:05:15.095Z'
    artifact_digest: 6f06e866f18a1b9c4fc9b35e04c5409ef3dc34809a5b8c876f614637df58300f
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74307
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8228ae4a760e6c05c4dfcfe7
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:21:31.283Z'
    finished_at: '2026-08-26T08:22:19.003Z'
    artifact_digest: d0a1e047d06183f8aaebc6fe3089346188f79fa0a23a6519d59069891c3ef2a6
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 47720
  - version: kibi.verification-receipt.v2
    receipt_id: VR-221a9d214ac2768fe8357339
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: e35a1f8939a4ceeaf12f0d56a7b28f32ca96a77ffd3e8913854c79790f2e2a29
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:17:42.406Z'
    finished_at: '2026-08-26T13:19:01.169Z'
    artifact_digest: 16897bcc66abff66258d80d03d94d4969a9be8f21a25dbee23b506a859b59c08
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78763
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d3094f245dbca4fbada76740
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:35:21.903Z'
    finished_at: '2026-08-26T13:36:37.964Z'
    artifact_digest: ff4aa1017b0f6b22a7fff9777c3987d64684acc00f7241abc7857fe00d9a0f8d
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76061
  - version: kibi.verification-receipt.v2
    receipt_id: VR-4124c1f10668a61c413b6c29
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:26:43.784Z'
    finished_at: '2026-08-26T15:27:59.637Z'
    artifact_digest: ff5e59ace1eb488df31f5dd1f1eeeaae6729335ace3a3cddc766ade07338986b
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75853
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9f7f66ef234d7426e7502e07
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:27:38.594Z'
    finished_at: '2026-08-26T16:29:07.250Z'
    artifact_digest: b66bf27634fe54922ed4aaacb01b534d83e31cfbf30e4ab4ff875870275d3e23
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 88656
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f886ba92c9b298bca7f3c611
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:31:42.613Z'
    finished_at: '2026-08-28T10:32:51.163Z'
    artifact_digest: e3f8e97c0a5c61d921b0740fe399bceb2fcfcba24ec6859153a610906a4758c2
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 68550
  - version: kibi.verification-receipt.v2
    receipt_id: VR-153a803e42061d40fef8344e
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:38:28.994Z'
    finished_at: '2026-08-28T13:39:38.799Z'
    artifact_digest: 89b768851ae84f6dff4575a0c8e357a47cd95671236beae302410e185dde2ad7
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 69805
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f29aa6cbfef50219e9da10b3
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:22:28.720Z'
    finished_at: '2026-08-29T01:23:38.734Z'
    artifact_digest: 0fbed8c72687a665c8748db1c486247ed42a0423a28e124459c9292f5b25db34
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70014
  - version: kibi.verification-receipt.v2
    receipt_id: VR-df12e7f9707126a9b1c6a5d8
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:41:07.056Z'
    finished_at: '2026-08-29T07:41:46.999Z'
    artifact_digest: 074d090a617777300dd27e4f85af6da82be77f676f863e5ea897e015e47af6d1
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 39943
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ef4d2c0fcc5e8fc9484e177d
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:10:55.278Z'
    finished_at: '2026-08-29T08:11:36.377Z'
    artifact_digest: 05c9ed5ce41a515c3f33f46ba854e23507b5c819ff3f62ff58e6f7142af56587
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 41099
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6e4975100cd0c5a5e646106d
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:42:29.524Z'
    finished_at: '2026-08-29T08:43:12.840Z'
    artifact_digest: bbb98d0e5ceab62d0ea13fe69aa9f0e39af169074f4a522573a96467783364e1
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43316
  - version: kibi.verification-receipt.v2
    receipt_id: VR-902266672bddbdc08da1ee52
    test_id: TEST-kibi-source-relationship-parity
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-source-relationship-parity
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-source-relationship-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:31:33.009Z'
    finished_at: '2026-08-29T09:32:13.401Z'
    artifact_digest: 61bc997166653e5ae1aff21901811a1d9cee4591a0c2154aa14fa43ef68f3bcf
    contract_hash: d4bbf523c5d8016f234101c4278f46566f9afe52cfb52565359fca9f1633fa49
    case_results:
      - symbol_id: SYM-test-packed-source-relationship-parity
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40392
---
The packed consumer test creates a tracked authored relationship after the initial compile, proves the scoped parity rule blocks on the exact missing edge, syncs, and proves the scoped check passes. Unit coverage separately proves runtime-only reverse ownership does not weaken authored-to-compiled detection.
