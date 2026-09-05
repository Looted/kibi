---
title: CLI unit tests prove canonical discovery, authoring, and ignore policy
status: passing
tags:
  - cli
  - canonical-layout
verification_scope: end_to_end
verification_perspective: internal
text_ref: packages/cli/tests/commands/sync/discovery.test.ts
id: TEST-cli-canonical-runtime
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-canonical-runtime
      target: default
  success_policy: all_required_first_attempt
---
Unit coverage lives in `packages/cli/tests/commands/sync/discovery.test.ts`, `packages/cli/tests/operations/source-authoring.test.ts`, `packages/cli/tests/public/ignore-policy.test.ts`, and `packages/cli/tests/traceability/git-staged.test.ts`.
