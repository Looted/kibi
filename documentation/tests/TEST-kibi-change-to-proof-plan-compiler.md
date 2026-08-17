---
id: TEST-kibi-change-to-proof-plan-compiler
title: Change-to-proof plan compiler verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-plan-compiler.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - planning
  - requirements
  - contradiction
  - traceability
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-plan-compiler
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-change-to-proof-plan-compiler
  required_case_symbols:
    - SYM-test-kibi-change-to-proof-plan-compiler
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-30e4e0f885dc27249326eba9
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:44:14.504Z'
    finished_at: '2026-08-16T19:45:26.386Z'
    artifact_digest: ace549e57caf43fb9e22e9dfb74330924374c09284f7279c6d4e7768d29c38ba
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 71882
  - version: kibi.verification-receipt.v2
    receipt_id: VR-2661fe313a3c5289ff9e552b
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:06:48.656Z'
    finished_at: '2026-08-16T22:08:13.282Z'
    artifact_digest: e8f829773404538f26f9b8af1df752dfda4d53d3e6a6e98e7af9e5e1dce670df
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 84626
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0fb489930a9106ff83d9a518
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:26:57.099Z'
    finished_at: '2026-08-17T12:28:10.046Z'
    artifact_digest: db165fbb4d33d0b7ae557c1fa40c47e2cbd87924c5036009858f2d9cb52150f2
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 72947
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9a2507a8d7c26b8907ba0170
    test_id: TEST-kibi-change-to-proof-plan-compiler
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-change-to-proof-plan-compiler
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-change-to-proof-plan-compiler
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:19:39.340Z'
    finished_at: '2026-08-17T21:20:55.659Z'
    artifact_digest: d21dacece33db9cb1452616ad7c573909c1bb65960e0690e96f08b0c6750151d
    contract_hash: c1f7a009aef05413f810222cdf76b7c6cc8b9e90b37c9ed7484ca9166030e232
    case_results:
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        project: default
        outcome: passed
        retries: 0
        duration_ms: 76319
---

Operation tests verify deterministic plan hashes, one disposition per assertive clause, contradiction and ontology-gap abstentions, dependency ordering, sequential apply behavior, and rejection of stale plan hashes. MCP and CLI fixtures assert the same planning and mutation contracts.
