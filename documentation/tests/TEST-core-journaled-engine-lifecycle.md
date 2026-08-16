---
id: TEST-core-journaled-engine-lifecycle
title: Engine daemon serialization, recovery, and protocol fencing
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - engine
  - lifecycle
links:
  - type: validates
    target: SCEN-core-journaled-engine-lifecycle
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
    - TEST-core-journaled-engine-lifecycle
  required_case_symbols:
    - SYM-test-core-journaled-engine-lifecycle
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-fdd5aff7bf507d55706152f3
    test_id: TEST-core-journaled-engine-lifecycle
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-lifecycle
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:47:24.473Z'
    finished_at: '2026-08-16T19:47:32.140Z'
    artifact_digest: 6a57b7cd50e9a19113de56e468a648a99a82cb641a1192113e336975a9b6d71f
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7667
---

The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
