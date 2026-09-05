---
title: Init unit tests prove canonical layout
status: passing
tags:
  - cli
  - init
  - canonical-layout
verification_scope: end_to_end
verification_perspective: internal
id: TEST-cli-canonical-init
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-canonical-init
      target: default
  success_policy: all_required_first_attempt
---
Unit coverage in `packages/cli/tests/commands/init.test.ts` asserts that `kibi init` writes `.kb/manifest.json`, does not write `.kb/config.json`, and gitignores derived `.kb/` runtime trees.
