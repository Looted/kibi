---
title: Packed CLI doctor workflow diagnostics
status: active
tags:
  - cli
  - doctor
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-doctor
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-doctor-workflows
type: test
---
