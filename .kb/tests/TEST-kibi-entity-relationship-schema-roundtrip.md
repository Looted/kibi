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
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
      target: default
    - symbol_id: SYM-test-packed-typed-relationship-roundtrip
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c97f049f7cb43f5b75d26455
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 36109583c8f27d8f339459892566ecce594296e912e43cd3b1f114d6a4e6c3b9
    binding_hash: 50f7356d9b48f21c5da4e4e4469c6ef17f84f2d514940279a34c6b410d593d1a
    fingerprint: cdc10ed07491bfff1de0bb3800f6fb60c731d8116eea38fd50f1fb5c323ebcf2
    fingerprint_components:
      contract: 36109583c8f27d8f339459892566ecce594296e912e43cd3b1f114d6a4e6c3b9
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-packed-eight-entity-schema-roundtrip
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-packed-typed-relationship-roundtrip
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Asserts that:
- all canonical entity types (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, and `fact`) are present and queryable
- unsupported types are rejected at query time
- required fields are persisted with canonical timestamps and source provenance
- typed relationships are stored and reloaded with provenance from a fresh CLI process

