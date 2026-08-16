---
id: TEST-test-journaled-engine-harness
title: Journaled engine test reuse, isolation, and cleanup suite
status: passing
created_at: 2026-08-12T00:00:00.000Z
updated_at: 2026-08-12T00:00:00.000Z
source: packages/cli/tests/engine.test.ts
priority: must
tags:
  - testing
  - engine
  - cli
  - e2e
links:
  - type: validates
    target: SCEN-test-journaled-engine-harness
  - type: validates
    target: REQ-test-journaled-engine-harness
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-test-journaled-engine-harness
  required_case_symbols:
    - SYM-test-owned-engine-runner
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7321db37149b198b57887649
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:18:48.432Z'
    finished_at: '2026-08-16T19:29:59.259Z'
    artifact_digest: fa2852f48589221af1682cd570e91769f01577939947ceeaf11a74a092265d3e
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 670827
---

The harness tests verify graceful signal-driven journal flush and replay,
shared interactive Prolog fixtures for ordinary behavior, exact CLI metadata
and lazy-loader parity, bounded root-suite concurrency and deterministic
summaries, shared packed installation setup, private engine runtime ownership,
and teardown before fixture deletion.

The full curated unit and packed E2E suites provide the integration evidence:
they must complete without leaked test-owned engines, isolation failures, or
contract drift across CLI and MCP surfaces.
