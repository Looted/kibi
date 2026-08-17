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
---

In a temp git repo with hooks installed:
1. Adds a requirement markdown file and commits
2. Switches to a new branch via `git checkout -b test-branch`
3. Asserts `post-checkout` hook ran `kibi sync`
4. Runs `git merge main` and asserts `post-merge` hook ran `kibi sync`
