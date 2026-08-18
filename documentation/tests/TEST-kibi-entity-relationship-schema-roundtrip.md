---
title: Entity and typed relationship schema round-trip
status: active
priority: must
tags:
  - cli
  - e2e
  - schema
  - relationships
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: REQ-004
  - type: validates
    target: REQ-005
  - type: validates
    target: SCEN-kibi-entity-relationship-schema-roundtrip
id: TEST-kibi-entity-relationship-schema-roundtrip
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-entity-relationship-schema-roundtrip
  required_case_symbols:
    - SYM-test-packed-eight-entity-schema-roundtrip
    - SYM-test-packed-typed-relationship-roundtrip
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1fc4452baa29a26465c11a4d
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fcb38ac8aedffbedf4b6a52c8e28b46ff79eb712af662445ed58452b538c3e4
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T19:09:04.858Z'
    finished_at: '2026-08-17T19:09:57.977Z'
    artifact_digest: 4d0df3683c840374f86321f1c633c6b3ec733a514b43d91f710dac8731832f95
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: failed
        retries: 0
        duration_ms: 53119
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: failed
        retries: 0
        duration_ms: 53119
  - version: kibi.verification-receipt.v2
    receipt_id: VR-25460626d9ceb00c11ad7830
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 12ef6da62e45d998a2f489133906f6fe7818382c717c9f38d509813834a2f200
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T19:13:54.657Z'
    finished_at: '2026-08-17T19:14:48.191Z'
    artifact_digest: 5b1e194caac2ce01617e0446b94ffd7683b135c8a6a3272d9d7d6437a549304d
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53534
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53534
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ed6cdfcbe43548690788d6e0
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:02:02.245Z'
    finished_at: '2026-08-17T21:02:55.949Z'
    artifact_digest: 4ea784dab1a498ded3ea634ffa94335abc2565284d2ebe5686a19aca4e55df29
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53704
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 53704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-ee5c0b1901ff9325aaa1e5bb
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-entity-relationship-schema-roundtrip
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:16:36.598Z'
    finished_at: '2026-08-18T07:17:33.192Z'
    artifact_digest: 5df04aff5f7d7f7df61fba2fd73b0f8254687c339fa62f835acf09c6bc2d5213
    contract_hash: 639cec8caf7c418fcf0af268fe5f77ef2aca798443fa404ac99f2e48e61c6e68
    case_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 56594
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        project: default
        outcome: passed
        retries: 0
        duration_ms: 56594
---

Asserts that:
- all canonical entity types (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, and `fact`) are present and queryable
- unsupported types are rejected at query time
- required fields are persisted with canonical timestamps and source provenance
- typed relationships are stored and reloaded with provenance from a fresh CLI process

