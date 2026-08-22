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
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a935912629928d2642005a8c
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
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:05:00.079Z'
    finished_at: '2026-08-16T22:05:08.436Z'
    artifact_digest: e8cf7f5003b7827748433bf4a5ba0ee3dd2a072dbd38edf949bb065b33e9882f
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8357
  - version: kibi.verification-receipt.v2
    receipt_id: VR-0d169d3e06fa9b759aed6a96
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
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:25:26.705Z'
    finished_at: '2026-08-17T12:25:34.573Z'
    artifact_digest: 1a78678fc9f32733ebe2cf597f10bdb09bb9ddafdc8f704c97e2ddddfffab968
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7868
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ca88ab77f3d19777205cd1f9
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
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:18:07.281Z'
    finished_at: '2026-08-17T21:18:15.193Z'
    artifact_digest: 942ad4abf01d49ca8f70a1731577fb815642efafb2f6ec7ed6ecff0b7f8fcbaf
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7912
  - version: kibi.verification-receipt.v2
    receipt_id: VR-268168778b6486f9a0b9b80e
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
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:33:39.599Z'
    finished_at: '2026-08-18T07:33:47.817Z'
    artifact_digest: 477a24ab38ef96d78155d71b5a2bc83fdf05ffbb3bdc5aebc016d3c326e230ab
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8218
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cedfd622639f627f8e83f274
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
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T10:33:27.679Z'
    finished_at: '2026-08-18T10:33:35.755Z'
    artifact_digest: 9809f83e696df048fdc9c9c13972700363b8327bce4c1fec37e71766adb317ec
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8076
  - version: kibi.verification-receipt.v2
    receipt_id: VR-c8c9b7b9de228d7ded0d361e
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
    code_snapshot: c48e4e5e6bf1e08e5f59b2d6c88d4da1b32d4eb2707fb99badee3b2402808829
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T22:56:05.688Z'
    finished_at: '2026-08-21T22:56:14.982Z'
    artifact_digest: 69c14330ee50720ddfccf9582cab29b2f39b7e0c3694c83f9c214ae9d26a75d6
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 9294
  - version: kibi.verification-receipt.v2
    receipt_id: VR-858482acf0e249e316c34855
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
    code_snapshot: cb77b2b695d4e466bfedb16fac2a3bddb249966b53ae473aedbb13445862aee8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T01:21:55.600Z'
    finished_at: '2026-08-22T01:22:06.533Z'
    artifact_digest: d13ab2ab77895d05c98576fd967efdce9fe28d8a395d159010983126c1359c28
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10933
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8ce1ef81feea2961a51d2a45
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
    code_snapshot: 9c04636c66570b14fd6e890c541ae0005a88c3b77ec6727c1e1c80e61f7f80b6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T08:23:44.962Z'
    finished_at: '2026-08-22T08:23:55.706Z'
    artifact_digest: b914b799bc1160ed0f158a326f5edecd276bee504d76b5e616d400f933ed4aea
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 10744
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b938cd45fa847040ea2b15f5
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
    code_snapshot: 12adc5e3689eb40ec518ae0a74655e7e1148d20ad8b8ca2a031cc3f4401d04f6
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T10:04:54.117Z'
    finished_at: '2026-08-22T10:05:02.694Z'
    artifact_digest: 21ef1d478275ee5abd96eb8a9662ef0f9586972b6e8290de4e9e375737354dbd
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8577
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cb9e9bedbcb22d06b7d6cea6
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
    code_snapshot: 94f9e8c4ffc1d15bb89aa0bc45fe0fc920d6343d426e8182198e696832604f20
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-22T12:58:46.894Z'
    finished_at: '2026-08-22T12:58:55.051Z'
    artifact_digest: 055016235a04030a2651d9a1fd9a7daa34b02a73b7e1ea4173c3e08fc9dc7524
    contract_hash: 61d4add5b0e3bf8f8b7c432b951f2a2c1211224913c1b93d120583e3ff015cd1
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-lifecycle
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8157
---

The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
