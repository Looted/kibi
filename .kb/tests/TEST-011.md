---
id: TEST-011
title: pre-commit hook blocks commit on coverage violation
status: active
created_at: 2026-02-20T09:36:22.000Z
updated_at: 2026-02-20T09:36:22.000Z
priority: must
tags:
  - enforcement
  - hooks
links:
  - type: validates
    target: SCEN-009
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-011
      target: default
  success_policy: all_required_first_attempt
type: test
---
Covered by packages/cli/tests/commands/init.test.ts pre-commit hook tests.
