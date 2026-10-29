---
title: Consumer CLI blocks happy-path-only requirements until a rejection scenario or an approved waiver
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-29T22:35:00.000Z'
id: TEST-kibi-happy-path-gap
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-happy-path-gap-verifier
      target: default
  success_policy: all_required_first_attempt
---
Authors a quota requirement and its scenarios in a fresh workspace and checks through the built CLI that success scenarios alone leave the happy_path_only gap with a suggested opposing value, that a rejection scenario the requirements permit is reported by scenario-outcome-mismatch and does not count, that a rejection scenario assuming the forbidden value closes the gap, and that a failure-side waiver counts only once approved (packages/cli/tests/consumer/happy-path-gap.test.ts).