---
id: TEST-004
title: kibi check detects must-priority coverage violations
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - check
  - validation
links:
  - type: validates
    target: REQ-cli-check
  - type: validates
    target: SCEN-005
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-004
  required_case_symbols:
    - SYM-e2e-packed-cli-check
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bcce75da864f2c3e1dd540fd
    test_id: TEST-004
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-004
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-004
    scope: end_to_end
    outcome: passed
    code_snapshot: 9d132bf4cfb19cdd2217270c12be7528e8de0255ad1c638be475ed55e321bd7a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T11:41:16.810Z'
    finished_at: '2026-08-29T11:44:54.746Z'
    artifact_digest: f3c1a8e727013fa731224f771de67ab0f69a320908f62ee6cc6b20c768a1aa4a
    contract_hash: 81bc4dc19cb423fb5765f806a512197956116c6ddf97df5bcd640a6ac72ec737
    case_results:
      - symbol_id: SYM-e2e-packed-cli-check
        project: default
        outcome: passed
        retries: 0
        duration_ms: 217936
---

Seeds KB with a `must`-priority requirement that has no linked scenario or test.
Runs `kibi check --rules must-priority-coverage`. Asserts:
- Exit code is non-zero
- Output contains the uncovered requirement's ID
- A requirement with full scenario + test coverage passes the same rule
