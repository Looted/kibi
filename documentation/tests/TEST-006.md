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
---

In a temp git repo with hooks installed:
1. Adds a requirement markdown file and commits
2. Switches to a new branch via `git checkout -b test-branch`
3. Asserts `post-checkout` hook ran `kibi sync`
4. Runs `git merge main` and asserts `post-merge` hook ran `kibi sync`
