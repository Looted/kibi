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
    receipt_id: PR-c2aff8f44db29edc20f264ba
    test_id: TEST-proof-entity-query-chunk-size
    scope: unit
    outcome: passed
    code_snapshot: 6f361d2b7a0ce4be8a55a8981006015e29d04d73175b724e90cd4a7d0f2b289f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:24:37.669Z'
    finished_at: '2026-10-28T17:24:37.864Z'
    artifact_digest: e83b684d472495fb38c03293364507d4d4e3e0cf058991c5bccf7888ce33dfce
    contract_hash: 19b3aa22464bcadce86903b6bc2db303d221ce6d74a9c90aa55dc9fbf1f605d4
    binding_hash: c3a08e6828cb15507d6424e42ab08dfb70249fbc89a891e1766b62c1d7053811
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