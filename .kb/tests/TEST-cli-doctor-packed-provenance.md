---
title: Packed npm and pnpm consumers report doctor provenance without false package actions
status: passing
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-cli-doctor-packed-provenance
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-doctor-packed-provenance
      target: default
  success_policy: all_required_first_attempt
---
