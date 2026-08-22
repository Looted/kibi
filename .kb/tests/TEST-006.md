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
---

In a temp git repo with hooks installed:
1. Adds a requirement markdown file and commits
2. Switches to a new branch via `git checkout -b test-branch`
3. Asserts `post-checkout` hook ran `kibi sync`
4. Runs `git merge main` and asserts `post-merge` hook ran `kibi sync`
