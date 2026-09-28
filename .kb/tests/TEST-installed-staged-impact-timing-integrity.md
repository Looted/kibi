---
title: Installed staged-impact timing observations remain bounded and fail closed
status: active
text_ref: scripts/benchmark-installed-staged-impact.test.mjs
tags:
  - multilingual
  - benchmark
  - timing-integrity
  - installed-consumer
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-installed-staged-impact-timing-integrity
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-installed-impact-runWorkflow
      target: default
  success_policy: all_required_first_attempt
---
