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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-44cbf456e54cd05d505b230a
    test_id: TEST-test-journaled-engine-harness
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-test-journaled-engine-harness
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: failed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:27:22.572Z'
    finished_at: '2026-08-16T21:38:19.867Z'
    artifact_digest: 7d359452fb90c468075d7e4bdffcd2efaebdd0ff083ef345812027847e8d02b9
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: failed
        retries: 0
        duration_ms: 657295
  - version: kibi.verification-receipt.v2
    receipt_id: VR-061272bb206e97f259d5d835
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
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:52:37.664Z'
    finished_at: '2026-08-16T22:04:36.557Z'
    artifact_digest: 4ec83bfe2bdd60775c981c8200fe2d847e7f13b415853f2b617a77b9d4c9a941
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 718893
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65a6bc1db4b42560684d1eb8
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
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:14:11.386Z'
    finished_at: '2026-08-17T12:25:09.941Z'
    artifact_digest: a89d92e894cd6a0c60ba2d5414668e0c2d4a0a862d6ae3d2f2a6ad8bb81e89bc
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 658555
  - version: kibi.verification-receipt.v2
    receipt_id: VR-432b216e10e91c261b98af25
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
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:06:39.460Z'
    finished_at: '2026-08-17T21:17:49.957Z'
    artifact_digest: 05b5156ef3ba61db39753e68234a3c5649bd6324e3db935e62091f7db1010d3e
    contract_hash: 478ec005ea9cec6cb66a8b55cd2945aefaaf440294bd4ddc9eba7d3f3b260777
    case_results:
      - symbol_id: SYM-test-owned-engine-runner
        project: default
        outcome: passed
        retries: 0
        duration_ms: 670497
---

The harness tests verify graceful signal-driven journal flush and replay,
shared interactive Prolog fixtures for ordinary behavior, exact CLI metadata
and lazy-loader parity, bounded root-suite concurrency and deterministic
summaries, shared packed installation setup, private engine runtime ownership,
and teardown before fixture deletion.

The full curated unit and packed E2E suites provide the integration evidence:
they must complete without leaked test-owned engines, isolation failures, or
contract drift across CLI and MCP surfaces.
