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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-99e91b4d9b92ffcaf182ab8c
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 2d95747ab574b93887a56ae1b532198585a7f0d3f2a6591c93379569b83f15ce
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:10:44.292Z'
    finished_at: '2026-10-27T07:12:56.530Z'
    artifact_digest: b9743cdb49046dd0d1234be1d95a08c292f8a6ac9e3d5d0b8f19cef069293cd9
    contract_hash: 36109583c8f27d8f339459892566ecce594296e912e43cd3b1f114d6a4e6c3b9
    binding_hash: 4818e4904334b5ba75b454ae3957999628c99c83e6f3b7135e8f0e2daa36b6d4
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
    kind: e2e
    evidence_level: tested
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

