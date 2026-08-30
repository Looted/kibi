---
id: TEST-004
title: kibi check detects must-priority coverage violations
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - check
  - validation
links:
  - type: validates
    target: REQ-cli-check
  - type: validates
    target: SCEN-005
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-check
      target: default
  success_policy: all_required_first_attempt
type: test
---

Seeds KB with a `must`-priority requirement that has no linked scenario or test.
Runs `kibi check --rules must-priority-coverage`. Asserts:
- Exit code is non-zero
- Output contains the uncovered requirement's ID
- A requirement with full scenario + test coverage passes the same rule
