---
title: Packed authored-to-compiled relationship parity contract
status: active
priority: must
tags:
  - e2e
  - relationships
  - parity
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-source-relationship-parity
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-source-relationship-parity
type: test
---
The packed consumer test creates a tracked authored relationship after the initial compile, proves the scoped parity rule blocks on the exact missing edge, syncs, and proves the scoped check passes. Unit coverage separately proves runtime-only reverse ownership does not weaken authored-to-compiled detection.
