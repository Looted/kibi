---
id: TEST-core-journaled-engine-persistence
title: Journal replay, rollback, migration, audit atomicity, and compaction
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - core
  - persistence
  - migration
links:
  - type: validates
    target: SCEN-core-journaled-engine-migration
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
    - TEST-core-journaled-engine-persistence
  required_case_symbols:
    - SYM-test-core-journaled-engine-persistence
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-a2a22d4864cc3615bc5ee034
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:46:55.658Z'
    finished_at: '2026-08-16T19:47:03.323Z'
    artifact_digest: 2c90c9c19ef988a9d0ea8928a9d128f95125c35aededdded34a8a9de4cf3ab59
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7665
  - version: kibi.verification-receipt.v2
    receipt_id: VR-b2b27f7e8d7ed718a8175353
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:04:44.903Z'
    finished_at: '2026-08-16T22:04:53.308Z'
    artifact_digest: 96fa211363690a36f6ac749e444323774e8d1cba0699700b88e48aa07820b50e
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 8405
  - version: kibi.verification-receipt.v2
    receipt_id: VR-01603283404c9646a981c96e
    test_id: TEST-core-journaled-engine-persistence
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-core-journaled-engine-persistence
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:25:14.407Z'
    finished_at: '2026-08-17T12:25:22.308Z'
    artifact_digest: 7c6d26522aef4a77f2b65ead911d41e3d8397825cff4b6b8e8dc4589b100a574
    contract_hash: c8501a74965a49669d0969698cd1691dab9a7fc0be1d11e3b248679f38802bc0
    case_results:
      - symbol_id: SYM-test-core-journaled-engine-persistence
        project: default
        outcome: passed
        retries: 0
        duration_ms: 7901
---

The persistence suite attaches a journaled branch, verifies journal replay after
detach/reattach, proves a failed RDF transaction rolls back both entity and
audit resources, forces compaction, and checks that generation metadata and
audit exports remain consistent. Migration fixtures cover populated legacy
stores, corrupt input, digest/count mismatch, and repeated attempts.
