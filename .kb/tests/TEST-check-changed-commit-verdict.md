---
title: Changed check verdict tests
status: active
priority: must
verification_scope: integration
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-check-changed-commit-verdict
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-changed-commit-verdict
      target: default
  success_policy: all_required_first_attempt
---
Builds the scratch index over staged, unstaged, untracked, deleted and ignored changes and checks the real index is untouched; routes kibi check --changed through it; and runs kibi check --changed and kb_check changed:true on a repository with an unstaged new unowned function: the verdict is the gate's refusal, a check naming another file passes, and git diff --cached stays empty.