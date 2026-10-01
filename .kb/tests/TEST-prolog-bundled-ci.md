---
title: CI workflow contract, proof workflow contract, and cached-build population controls
status: active
tags:
  - prolog
  - bundle
  - ci
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-ci
type: test
---
