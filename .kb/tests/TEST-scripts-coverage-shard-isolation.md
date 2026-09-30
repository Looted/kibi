---
title: Scripts coverage shard configuration contract
status: passing
tags:
  - coverage
  - testing
  - scripts
  - ci
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-scripts-coverage-shard-isolation
      target: default
  success_policy: all_required_first_attempt
id: TEST-scripts-coverage-shard-isolation
type: test
---
Run `bun test ./scripts/tests/unit-coverage-runner.test.ts`. The contract reads the runner's exported scripts shard and compares it with the recursively discovered test/spec inventory, checks the root summary occurs exactly once after those paths, and checks the process-per-file isolation request. It does not claim that native SWI builds or the full unit coverage campaign succeed.