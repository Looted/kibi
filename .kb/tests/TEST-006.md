---
id: TEST-006
title: Git hooks fire on branch switch and trigger KB sync
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - integration
  - hooks
  - git
links:
  - type: validates
    target: SCEN-003
type: test
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-006
  required_case_symbols:
    - SYM-test-packed-default-branch-sync-hooks
    - SYM-test-packed-post-merge-sync
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d087b800a7dfb3edc22e749f
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:05:48.929Z'
    finished_at: '2026-08-17T12:06:37.407Z'
    artifact_digest: bd8046ecb6b869ece18bfc456299e4bd3702aea7397d9e0b558acd85f0b448ab
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48478
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48478
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1d7687e696d1a86ca3d98c77
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T20:56:02.805Z'
    finished_at: '2026-08-17T20:56:55.726Z'
    artifact_digest: bfd86a6692a5a1ed2c437313903ff4077db6f3246f267d9420c158ae0ec560bd
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 52921
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 52921
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8528954df004a3c6dcf2e926
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:10:18.470Z'
    finished_at: '2026-08-18T07:11:11.247Z'
    artifact_digest: 16810c388b7679670a2225ebbefae9d0c17388f3de755855d44066984aa53e3e
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 52777
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 52777
  - version: kibi.verification-receipt.v2
    receipt_id: VR-023c6c2a1e15f61c89b8d7f7
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:38:42.234Z'
    finished_at: '2026-08-18T10:39:39.764Z'
    artifact_digest: 9682458e5538a4ece2a88d97ead8546f504dd1659e191bc319df97b22baccd41
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57530
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 57530
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b4bf12d5ba6d8090611d18c1
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T21:49:36.875Z'
    finished_at: '2026-08-21T21:50:02.902Z'
    artifact_digest: d2c01eb2bd5b900a9139f4c35538c476045cff2e06dac004c64d3b261eeddb48
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 26027
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 26027
  - version: kibi.verification-receipt.v2
    receipt_id: VR-e561d9c4fc79017b6489b71c
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: effbf8a583dd01f92d387ce674e9a0c431312c51d3036e30ee9886accfe673a0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:05:02.924Z'
    finished_at: '2026-08-21T22:05:28.646Z'
    artifact_digest: adceeec3b34d00ff794abdb56103755cd2e98161d9f392bfe279db87235ba9d3
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 25722
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 25722
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c953b7b46d6643886423dd92
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T00:54:33.406Z'
    finished_at: '2026-08-22T00:55:08.891Z'
    artifact_digest: 483941cbe7ab32b8b35cb3ea0dccca9ed6bc9c57ab346538ebac2290a12be221
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35485
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 35485
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9c686453bc58ef71a4579951
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T07:57:26.516Z'
    finished_at: '2026-08-22T07:57:51.224Z'
    artifact_digest: fbcadad0a2078f99c0249a84172708e0d88ba1128b784ddb11fcf3c01f677413
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24708
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24708
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f243f179993b91ba02d870df
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T09:45:43.683Z'
    finished_at: '2026-08-22T09:46:07.886Z'
    artifact_digest: d1b5069781c0d27f643929b76cad0d8330bead6cedb42fa0bdeb6955a1f78f3d
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24203
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24203
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8e6fa64f83b556dbf3f9c97d
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:42:04.935Z'
    finished_at: '2026-08-22T12:42:25.263Z'
    artifact_digest: b625371754057f4615a83d600cff523b6ce353500df9c9bb794f9678cf80d7f1
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20328
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20328
  - version: kibi.verification-receipt.v2
    receipt_id: VR-03237105e10c84e2e00cb7bb
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 3afb007721f10fdc9541548621a8ca951281df404bff11a5ce6de6245c1f5025
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:03:48.554Z'
    finished_at: '2026-08-22T21:04:10.592Z'
    artifact_digest: 95a1ed219b18d12419304867040da06528516ad39e601a38731924e1002b24f9
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22038
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22038
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a476436c635cec4e016f857b
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 25a181eaaaadfb8fd67f705eb6860d38519058426fc314fdea1f5e390367a49b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T21:30:22.372Z'
    finished_at: '2026-08-22T21:30:46.398Z'
    artifact_digest: 8aaa7b3247dfa4e62b1002829ebf174436876930fb7b290db72890ef08c1c492
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24026
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24026
  - version: kibi.verification-receipt.v2
    receipt_id: VR-39f24450b5801b47039640ba
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: deb8c4992fb85b1ad30c9c9ae604df2cddeefdce798afb1bbc3803bb17d93b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T22:00:53.436Z'
    finished_at: '2026-08-22T22:01:13.397Z'
    artifact_digest: b274aa68ec72f277398c66b2f5d003cbbdb70921e29685181457e429839fec4e
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19961
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19961
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d6657a12ad6189bead89ca3e
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 179ebe71578e274182f932a44b388e84629d8c35aab70e11ed71512b5426c8e3
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T07:30:46.685Z'
    finished_at: '2026-08-23T07:31:07.457Z'
    artifact_digest: dc79dc4f2c79cd02c3bd17c6ccf40e955e89b0bb4c7c6e76b8487178ee2c64f7
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20772
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20772
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2d5f815450401d3bf71265ff
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: bd8e6d28630c837d83bb606b786976c761f4bcb8326f1aab37d01845783fbafe
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T08:14:22.868Z'
    finished_at: '2026-08-23T08:14:43.927Z'
    artifact_digest: 3c1446728a9b865a13cec52611c8f8ce894a0ef26dedeac571dc48b19af55ccb
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21059
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21059
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c3662c5e6035c4661a2045a3
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: ee22ec51c9bc3153aa0a330d71805a1c8ce310bf3a763dc346ad13e15071ba11
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T12:11:35.258Z'
    finished_at: '2026-08-23T12:11:55.345Z'
    artifact_digest: 833d6f4f7213e778b19bb3e888434c630fa46e7a72d89efc0f6813483c94cf4d
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20087
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20087
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8861590d4a3805ec77b6c17b
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: dea1a8d20393c9e2212505a158b80a73843c68d9ea042614fc6c80fa98589b28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:11:20.946Z'
    finished_at: '2026-08-23T19:11:40.970Z'
    artifact_digest: f0e62ab299763e0af64d9f5da80c39fb6efb67fe45c36352fbf6559a834e6619
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20024
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20024
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bab6f8da0556a2a4feb4a36d
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: dcfad834bdf07e98adee34ec88d018b898fcdad42b22ba99a91adbfd48ff7459
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T19:37:29.249Z'
    finished_at: '2026-08-23T19:37:50.370Z'
    artifact_digest: 72c5bfac2a6fd40dd95ed71e3cf9285753187517d7518e4fcf17ba7146b12338
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21121
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21121
  - version: kibi.verification-receipt.v2
    receipt_id: VR-15f48282cf0256bd27fd5411
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 14ca65ca0dd701b64b6b9dc632e9eeda9ed796c6b816a70fbd6b50db303194cc
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:05:25.433Z'
    finished_at: '2026-08-23T20:05:46.188Z'
    artifact_digest: a563dbf46b4751e4aa08a88a266b9321dca260637a3b97090d4e6cab46db8978
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20755
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20755
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cb9b3db6a3ef5f1f6e062ea7
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 3ee001d32bb209a819714ba2e42edd8ab694bfb5be890192445fb7e202afb01b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T20:31:45.228Z'
    finished_at: '2026-08-23T20:32:05.946Z'
    artifact_digest: 36370f77dbe6d07dbb08aac436bfe2d3cc488c2ea823d7985765fe0c660a3348
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20718
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20718
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f171fffc8fcbda367b8d22da
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 8da5165ebb43b8ee33c18ba479134826479b9cecae4caf47c854dd2a844555c7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:12:39.613Z'
    finished_at: '2026-08-23T22:12:59.082Z'
    artifact_digest: 76d96f4eb883dc18ee70952a258cd049964fa50666e79995628309d168b3b1b2
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19469
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19469
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2515b026ddc0e6d64c6dcafe
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 9506b01b3f5194b44f47602b13261ce3139304cec73818f4b0553c152eb51048
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-23T22:38:49.547Z'
    finished_at: '2026-08-23T22:39:09.163Z'
    artifact_digest: 102c3daf9b88ff9798e69ea2eb96350100bc36a02a5f9fc3c1c859722d00d9e0
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19616
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 19616
  - version: kibi.verification-receipt.v2
    receipt_id: VR-6fa1a02ce107c45383ce9252
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: a54a428a72f914fe4ee86257b1e2eb792f98958f88ccf0d6a45eef244ab53055
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:24:05.959Z'
    finished_at: '2026-08-24T06:24:30.787Z'
    artifact_digest: 3e59cf9562b242c0688e20a9c20bba91bdeef68a8a2c78dcb833e0c16ea6d30b
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24828
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 24828
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8a0d3606ddafebd4e2195d2d
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: c2c5a06c408b705211516e8bd1f6733b82e8addfc4acd70c33d47a850f768285
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T06:52:12.023Z'
    finished_at: '2026-08-24T06:52:32.897Z'
    artifact_digest: 1c70cea7fae13b043bc222d04f5f33bd7351c79efd72c9ab218c85a334c42e15
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20874
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20874
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b17e4551472b1badd5bcc433
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:22:18.660Z'
    finished_at: '2026-08-24T07:22:39.139Z'
    artifact_digest: 014fa8e1c037d03577d711f83a4008bcc1221a42a8cbdda523fd44159693d0e0
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20479
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 20479
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8e5771ba055b03ba218bad16
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 87c6ab7e6f971c15102202ee73e00746d5131749ae89a78713d45f63ce043d91
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T07:46:57.828Z'
    finished_at: '2026-08-24T07:47:20.128Z'
    artifact_digest: 54d06d8cc8de915f7c611067db0b2bc68c85da1f394cffb716d8d9a64b9e22f6
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22300
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 22300
  - version: kibi.verification-receipt.v2
    receipt_id: VR-00b362d109eba84d61db90e2
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 0202c720e01d3b5e58358f98e61e524d501259ef3b14d6f74a44ef1fd03cfad1
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:19:12.920Z'
    finished_at: '2026-08-24T08:19:34.885Z'
    artifact_digest: bbb8dd19cc32d1446e07e715864bf3e04adcaf1ebbbbcf1cd5dccca84bed480a
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21965
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21965
  - version: kibi.verification-receipt.v2
    receipt_id: VR-712c21af7f14fab6e002c898
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e0dc87316dbd903ca5f2e3da37265c33a1559b0fecdabc93ab978662fad7b3b
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-24T08:48:41.617Z'
    finished_at: '2026-08-24T08:49:03.063Z'
    artifact_digest: b7d70b037d7a5eb7e8846f26f44f5784f4d58ddd29768f22ad2686870637d9f9
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21446
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21446
  - version: kibi.verification-receipt.v2
    receipt_id: VR-37a5b9e001bb417506821a7d
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: b4c293e5c38acc3b1634297cb581f7a47990af06b571a148378040241f223e20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T20:52:24.139Z'
    finished_at: '2026-08-25T20:52:45.841Z'
    artifact_digest: 26def73e2af08feb7ed65f06ddf311e6b5f5a14a56429db4467aa92cd7683c85
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21702
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 21702
  - version: kibi.verification-receipt.v2
    receipt_id: VR-78b524f8e3373610f61d9b28
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: ade9827cc7a818c6ea2869e688fc01ca1e4e1127c9481d41441e12144ed18676
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-25T21:35:53.073Z'
    finished_at: '2026-08-25T21:37:09.044Z'
    artifact_digest: 605da36a1790e6bf87fc3e1c35286ccda3e6f2b23c674b16e8d035cc5bd36346
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75971
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75971
  - version: kibi.verification-receipt.v2
    receipt_id: VR-040b454c16a7c773d0417f89
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: d05b6ad2fc0eb5c8d0ff9abb1a217c51379278842eca9e1abd81a2786666cb6c
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T08:23:10.742Z'
    finished_at: '2026-08-26T08:24:00.423Z'
    artifact_digest: bc4ad4c00c2fe9c3e7dcc2979abcb77ebbfc8c06592f7c6425e719d67321bccd
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49681
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49681
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0e78148878f4dd6cbdc336a3
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: e35a1f8939a4ceeaf12f0d56a7b28f32ca96a77ffd3e8913854c79790f2e2a29
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:20:18.501Z'
    finished_at: '2026-08-26T13:21:41.491Z'
    artifact_digest: 83c5f3e87f85cf8348e90898859351245f22f23c2892f266ed98ca53e59ea3cb
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 82990
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 82990
  - version: kibi.verification-receipt.v2
    receipt_id: VR-884005139903c0f158d263f4
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 577989e891f4f7297aa31da46d632ac1ddf85ba7929cfdca9f3ec1e4c273331d
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T13:38:08.438Z'
    finished_at: '2026-08-26T13:39:27.003Z'
    artifact_digest: d24814e5e6cd5377d3a446ce0e59cbc671f60fc32d54b1cd624174b965f1e2e5
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78565
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 78565
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0f856adf2f212e055c6c059c
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T15:29:35.989Z'
    finished_at: '2026-08-26T15:31:06.736Z'
    artifact_digest: aa517f9862bf704d89a0ced04d351b414c1e857c3ebe8911a90755820239eed3
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 90747
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 90747
  - version: kibi.verification-receipt.v2
    receipt_id: VR-47f92bdf8dfeb5802d0d11a4
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e5085ece690e1baa2d9a277ec4c99993c802df32ae42bd782a1c3c5902823f2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-26T16:30:29.746Z'
    finished_at: '2026-08-26T16:31:50.381Z'
    artifact_digest: fdda5952495ea8808073d7bad61d41925b96c89f458025adc3405cfcd1cc1134
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 80635
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 80635
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ab864a529cc0189d04af4cef
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 91109af11cd1ef36564e3117094f1d32bd300f0d0681d3edc9c6d93bd6bed504
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T10:19:14.069Z'
    finished_at: '2026-08-28T10:20:30.150Z'
    artifact_digest: 3b75bff4b0a2253700a8552eba44bbec16a45d7dd841186fbb357a29061743e1
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76081
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76081
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2dc2ef18a686d498d77568b1
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: f86facfbbb7c23a7050b4299d1074859fdcb81065130a17ae1e05c0a9b655aca
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-28T13:20:44.031Z'
    finished_at: '2026-08-28T13:22:03.611Z'
    artifact_digest: 0520ee45fc9fbe17fb729b350a9872b692a4a8739a0e994ed2b344ff13bf1bc0
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79580
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79580
  - version: kibi.verification-receipt.v2
    receipt_id: VR-3612348b87ae0af1e42d3756
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 0749287725d05ae61492545fe48b3476fb7435520056d5fca1a8d407c10fe22a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T01:08:13.624Z'
    finished_at: '2026-08-29T01:09:29.270Z'
    artifact_digest: b3a80af35ef3f74a3809bb91c76bc6059906df847259038d3d38f2585ae4e3dc
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75646
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 75646
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ca451bcb8cf66506b8730fc8
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: d2df506c1ba2d8efef1a4de347c51c009735441dfab330c40280b8b0713686ad
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:31:59.093Z'
    finished_at: '2026-08-29T07:32:44.062Z'
    artifact_digest: 2d882077ca8c96fdfd81628b1b2266d16cd7791061bcad5d8e6fa04c24e77fb1
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44969
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44969
  - version: kibi.verification-receipt.v2
    receipt_id: VR-85cf3c40fa50e51884e8ad36
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ceda44cecf972c003132506e79557beee5eab748de731605f0fc50cf75ab2b4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T07:59:46.795Z'
    finished_at: '2026-08-29T08:00:30.915Z'
    artifact_digest: 016f31c3ee8c8b3bd2e9ed7e8451da720e3867668d5d56ddc3299929e54c4677
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44120
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44120
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2c3dc18b0c3cd322b173e3a1
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 63a489a58fd839d7993492cb197c7567bc3903325471cd321f0c68d40af09ab7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T08:31:21.291Z'
    finished_at: '2026-08-29T08:32:09.642Z'
    artifact_digest: 837a381b657148eefe41fd38bc560ee17da74b96c9f468a456e2a83816b40e14
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48351
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48351
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed231b6b125da7e4978621ca
    test_id: TEST-006
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-006
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: ccec27cd614806a8cebd0544ee4fae8bb17851102771d068fa1272c21213eee7
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T09:20:46.214Z'
    finished_at: '2026-08-29T09:21:30.818Z'
    artifact_digest: d4641e036ac050f3c25f4938d2a4db6291e89cc5927ad7ce169330d4a90ddfd0
    contract_hash: ed20e82f89da5234627d62ae72162872c2adc38b2f320e49c0ecba7150f14f3c
    case_results:
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44604
      - symbol_id: SYM-test-packed-post-merge-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44604
---

In a temp git repo with hooks installed:
1. Adds a requirement markdown file and commits
2. Switches to a new branch via `git checkout -b test-branch`
3. Asserts `post-checkout` hook ran `kibi sync`
4. Runs `git merge main` and asserts `post-merge` hook ran `kibi sync`
