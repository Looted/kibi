---
title: Entity and typed relationship schema round-trip
status: passing
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
    receipt_id: PR-a337774d82029c30f037793b
    test_id: TEST-kibi-entity-relationship-schema-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 36109583c8f27d8f339459892566ecce594296e912e43cd3b1f114d6a4e6c3b9
    binding_hash: a6c28cc471ee22e041e3b27a3d5f9f542ab9b3eaece6142407722c04ce3c4a75
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

