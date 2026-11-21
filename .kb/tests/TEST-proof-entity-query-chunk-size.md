---
title: An entity query shall load at most 25 entities per chunk, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-entity-query-chunk-size
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-ENTITY_QUERY_CHUNK_SIZE
  proves:
    - CLAIM-E8EE9A72FD5CF65D
origin:
  kind: agent
  recorded_at: '2026-10-28T17:22:27.342Z'
id: TEST-proof-entity-query-chunk-size
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-31ecb4d3e6c54a3cdb906375
    test_id: TEST-proof-entity-query-chunk-size
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 19b3aa22464bcadce86903b6bc2db303d221ce6d74a9c90aa55dc9fbf1f605d4
    binding_hash: 2810479e04903059ee7e1571dad9faca1cfa0f64d1650c1021b9615a427793e7
    fingerprint: 209f1ed5e7dbb897c435fa81d6c8378f29e0131dd338e5ccd7dc4406bce77da4
    fingerprint_components:
      contract: 19b3aa22464bcadce86903b6bc2db303d221ce6d74a9c90aa55dc9fbf1f605d4
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
      - symbol_id: SYM-proof-entity-query-chunk-size
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-entity-query-chunk-size
      variable: entity_chunk_size
      value_type: int
      assumptions:
        - operator: eq
          value: 25
      claim:
        operator: eq
        value: 25
    certificate_digest: 4c07235cc2c052dee22b0d378872df8b59dbe09f4022a250ae32ce9475fcfcc5
    claim_bindings:
      - claim_key: CLAIM-E8EE9A72FD5CF65D
        requirement_id: REQ-kibi-operation-page-sizes
        fact_id: FACT-entity-query-chunk-size
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 25
          value_type: int
          variable: entity_chunk_size
---
Proves that an entity query shall load at most 25 entities per chunk, against the code Kibi reads at ingest.