---
title: Cursor lane qualification, gating, and usage errors
status: passing
verification_scope: end_to_end
verification_perspective: internal
id: TEST-skillopt-cursor-compat
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-cursor-compat
      target: default
  success_policy: all_required_first_attempt
---
