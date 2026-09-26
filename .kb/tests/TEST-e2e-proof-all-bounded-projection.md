---
title: Installed public prove-all excludes large unrelated archived test metadata
status: active
text_ref: documentation/tests/e2e/packed/proof-all-bounded-projection.test.ts
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - proof
  - consumer
  - projection
  - e2e
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
The relocated packed consumer exercises the public prove --all command with 501 tests, including 500 archived noncontract records. It asserts the sole contract is executed once, actual assertion results produce a passing receipt, and the receipt is queryable afterward. It separately measures reconstructed full-property JSON above 10 MiB over bounded public query pages.
