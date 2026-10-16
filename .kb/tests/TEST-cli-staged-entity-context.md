---
title: 'CLI: the staged check blocks a staged entity without body context and passes base-tree and acknowledged debt'
status: passing
priority: must
tags:
  - cli
  - staged
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-16T08:51:37.368Z'
id: TEST-cli-staged-entity-context
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-staged-entity-context
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-staged-entity-context
    target: default
    native_id: packages/cli/tests/consumer/staged-entity-context.test.ts::kibi check --staged entity context::blocks a staged entity without body context and passes debt the commit did not introduce
    source_file: packages/cli/tests/consumer/staged-entity-context.test.ts
    line: 57
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/staged-entity-context.test.ts`). It stages a new test entity without a body and asserts `kibi check --staged` exits 1 with `entity-context-missing` for that entity only, then asserts that the same file with a prose body, an edit to a committed entity that already lacked context, and an entity listed under `contextAcknowledged` in the manifest all pass.
