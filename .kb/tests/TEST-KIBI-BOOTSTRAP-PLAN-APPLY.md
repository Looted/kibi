---
title: Bootstrap planner/apply integration and journal recovery
status: passing
sourceFile: packages/cli/tests/operations/apply-plan.test.ts
verification_scope: end_to_end
verification_perspective: internal
id: TEST-KIBI-BOOTSTRAP-PLAN-APPLY
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-bootstrap-plan-apply
      target: default
  success_policy: all_required_first_attempt
---
