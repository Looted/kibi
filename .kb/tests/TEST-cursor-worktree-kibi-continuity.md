---
id: TEST-cursor-worktree-kibi-continuity
title: Cursor worktree continuity verification plan
type: test
status: pending
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
source: documentation/tests/TEST-cursor-worktree-kibi-continuity.md
priority: must
tags:
  - cursor
  - worktree
  - mcp
  - cli
  - policy
  - test
links:
  - type: validates
    target: SCEN-cursor-worktree-kibi-continuity
  - type: relates_to
    target: ADR-022
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cursor-worktree-kibi-continuity
      target: default
  success_policy: all_required_first_attempt
---

## Test Coverage

### Policy Checks

- The worktree continuity requirement stays linked to the new parity ADR.
- The scenario and test remain stable across worktree handoffs.
- The docs preserve history while keeping the current surface model readable.
