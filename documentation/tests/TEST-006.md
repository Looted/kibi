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
---

In a temp git repo with hooks installed:
1. Adds a requirement markdown file and commits
2. Switches to a new branch via `git checkout -b test-branch`
3. Asserts `post-checkout` hook ran `kibi sync`
4. Runs `git merge main` and asserts `post-merge` hook ran `kibi sync`
