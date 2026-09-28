---
title: Installed staged impact review, generated coordinate migration and trusted aggregate gate lifecycle
status: active
tags:
  - multilingual
  - impact-policy
  - stage-e
  - e2e
  - consumer
text_ref: documentation/tests/e2e/packed/impact-review-stage-e.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
    target: default
    native_id: documentation/tests/e2e/packed/impact-review-stage-e.test.ts::keeps exact staged and trusted-diff impact evidence through ownership repair and canonical receipt append
id: TEST-impact-policy-stage-e-installed-e2e
type: test
---
