---
title: Installed public prove-all excludes large unrelated archived test metadata
status: active
tags:
  - proof
  - consumer
  - projection
  - e2e
text_ref: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-proof-all-bounded-projection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-all-bounded-projection
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-all-bounded-projection
    target: default
    native_id: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts::selects the sole proof contract without materializing 500 large archived test records
---
