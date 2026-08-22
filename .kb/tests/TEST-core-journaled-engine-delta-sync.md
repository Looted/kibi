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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5a36a4df7056d716d798bc42
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
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:05:15.732Z'
    finished_at: '2026-08-16T22:06:35.338Z'
    artifact_digest: 1c0433b6681447794cfb68b4f4cd038da4475cea3066b29cd08c97828fe9a9a1
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 79606
  - version: kibi.verification-receipt.v2
    receipt_id: VR-49b5b9de66f7ebe39df8b1b9
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
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:25:38.990Z'
    finished_at: '2026-08-17T12:26:48.313Z'
    artifact_digest: 96dbcf94ffa49450667c80679e5149dfbf50b5b9e266660e3d804fb2fa2f0d0c
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 69323
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a81b42203208e26d71fc252c
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
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:18:19.825Z'
    finished_at: '2026-08-17T21:19:30.226Z'
    artifact_digest: ab54606a3293bc9ee4e60988931a2d2e1d5caac931a2084af15525b38fa9a1c1
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 70401
  - version: kibi.verification-receipt.v2
    receipt_id: VR-70c1fa3ec255b3754b98bf5b
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
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:33:53.268Z'
    finished_at: '2026-08-18T07:35:07.391Z'
    artifact_digest: 60bbc1079ec4891c75a68c0c5670ebbdb385da08757f661cca07b322e8e1dda4
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 74123
  - version: kibi.verification-receipt.v2
    receipt_id: VR-203c599b8209639e4d480fbd
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
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:33:40.470Z'
    finished_at: '2026-08-18T10:34:53.868Z'
    artifact_digest: c4582395a5d18cba33edb935ffaf9d5270ceae7d52f233bbc157f398236594cc
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 73398
  - version: kibi.verification-receipt.v2
    receipt_id: VR-26b7e89c9df59d7b636e79a9
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
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:56:22.901Z'
    finished_at: '2026-08-21T22:57:56.586Z'
    artifact_digest: 3c980aa680e095af4da0e7b55810db8fdbc4194d22300a254087d5a8bb2a2eb8
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 93685
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c9c2c135ff778e64fa2c21bd
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:22:17.642Z'
    finished_at: '2026-08-22T01:24:24.329Z'
    artifact_digest: 712e2db050084c000c57ab6c9d6c0a1950ddf056ad1a0ceeeca43f726e61b7cf
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 126687
  - version: kibi.verification-receipt.v2
    receipt_id: VR-51c75fde0ecc56a410fbeb6f
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
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:24:05.657Z'
    finished_at: '2026-08-22T08:26:04.914Z'
    artifact_digest: 3482edd4b755aa4814354c7016d0c85fc41b10eecf97615fc7a73661467a450f
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 119257
  - version: kibi.verification-receipt.v2
    receipt_id: VR-88a9452ce63a0ea094810543
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
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:05:09.660Z'
    finished_at: '2026-08-22T10:06:37.331Z'
    artifact_digest: bc2911a6cdbf532a708bea3de2192896b6f35231305401cb042c2b0bbfe2e427
    contract_hash: 0d3da02eed7c281471856b8f86a5ba1039505ca8fd69b6ff393e72e6303bcc55
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
        project: default
        outcome: passed
        retries: 0
        duration_ms: 87671
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
