---
title: Generated coordinate persistence and repair E2E
status: passing
id: TEST-generated-coordinate-repair
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-generated-coordinate-repair
      target: default
  success_policy: all_required_first_attempt
---
# Generated coordinate persistence and repair E2E

`packages/cli/tests/commands/symbol-coordinate-repair.test.ts` exercises the real CLI against a branch-local KB: same-value upserts preserve RDF coordinates without authored leakage, plain sync remains a no-op over warm-cache divergence, and the explicit approved refresh restores coordinates with a subsequent true no-op sync.
