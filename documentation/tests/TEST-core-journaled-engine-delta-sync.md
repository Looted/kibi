---
id: TEST-core-journaled-engine-delta-sync
title: Delta sync and performance gates
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - sync
  - performance
links:
  - type: validates
    target: SCEN-core-journaled-engine-delta-sync
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-core-journaled-engine-delta-sync
  required_case_symbols:
    - SYM-test-core-journaled-engine-delta-sync
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-570ec029b47ddcd4b1d70cbc
    test_id: TEST-core-journaled-engine-delta-sync
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-delta-sync
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:47:56.387Z'
    finished_at: '2026-08-16T19:49:05.803Z'
    artifact_digest: f1098806e30e03ab4b6d89f25122820a35267594883c1cfaa83fa7253d6ba0fe
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 69416
---

Contract fixtures cover no-op, one-symbol, relationship-only, deletion,
coordinate-only, and rebuild sync paths through the Node CLI and MCP.
The generated 10,000-symbol/30,000-edge fixture excludes setup from timed
regions and enforces every release gate: warm exact and paginated query p95 at
or below 100 ms; warm search and status p95 at or below 150 ms; ordinary
durable upsert p95 at or below 500 ms; no-op sync at or below 500 ms;
one-symbol sync p95 below one second; cold attach plus index build at or below
three seconds; full sync at or below 30 seconds; and steady-state engine RSS at
or below 512 MiB.
