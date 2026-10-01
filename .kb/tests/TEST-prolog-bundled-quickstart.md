---
title: Install guidance contract and README quick-start walkthrough controls
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
    - symbol_id: SYM-test-bundled-swipl-docs
      target: default
    - symbol_id: SYM-test-simulate-readme-quickstart
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-quickstart
type: test
---
