---
title: 'CLI: a links-only update on a class symbol is refused, an invalid dry run is an error, and symbol-coverage names the missing verified_by'
status: passing
priority: must
tags:
  - cli
  - symbol
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-symbol-link-guidance
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-symbol-link-guidance
    target: default
    native_id: packages/cli/tests/commands/symbol-link-guidance.test.ts::symbol link guidance::a coarse link is refused when it is written, an invalid dry run is an error, and symbol-coverage names the missing test link
    source_file: packages/cli/tests/commands/symbol-link-guidance.test.ts
    line: 69
origin:
  kind: agent
  recorded_at: '2026-10-15T15:56:21.012Z'
id: TEST-cli-symbol-link-guidance
type: test
---
Runs the CLI on a fresh KB with a class whose public methods are behavioral symbols. It asserts that a links-only `kibi upsert` on the stored class symbol is refused with the granular candidates, that the same payload as a dry run exits 1 with `UPSERT_DRY_RUN_INVALID`, that `kibi check` `symbol-coverage` on a method symbol whose test does not verify the scenario names `verified_by(SCEN-…, TEST-…)`, and that an invalid test status lists only the test values.