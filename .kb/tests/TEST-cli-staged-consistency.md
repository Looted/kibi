---
title: Consumer CLI staged check blocks an introduced infeasible scenario and passes an unrelated change over a committed one
status: passing
priority: must
tags:
  - check
  - staged
  - scenario-feasibility
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-staged-consistency
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-staged-consistency
    target: default
    native_id: packages/cli/tests/consumer/staged-consistency.test.ts::kibi check --staged consistency::blocks a staged infeasible scenario and ignores one already committed
    source_file: packages/cli/tests/consumer/staged-consistency.test.ts
    line: 57
origin:
  kind: agent
  recorded_at: '2026-10-06T18:18:37.260Z'
id: TEST-cli-staged-consistency
type: test
---
