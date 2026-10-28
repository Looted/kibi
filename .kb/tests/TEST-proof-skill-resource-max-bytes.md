---
title: A skill resource shall be at most 131072 bytes, by an arithmetic proof
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
    - symbol_id: SYM-proof-skill-resource-max-bytes
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-RESOURCE_MAX_BYTES
  proves:
    - CLAIM-8A9C68E905170BC4
origin:
  kind: agent
  recorded_at: '2026-10-28T19:13:22.014Z'
id: TEST-proof-skill-resource-max-bytes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-96de595636415e1cc1b453ed
    test_id: TEST-proof-skill-resource-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: d846074bf74573654815f076ec178545839e30bad96b6474414e0f92551f8631
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:14:51.073Z'
    finished_at: '2026-10-28T19:14:51.191Z'
    artifact_digest: 8156cd1ad400bac40daedfeb443fd153650d276316c209c98194140bc112fb4e
    contract_hash: ee3345fd5a4082bfe8e39998d216422515fbb41e792cf79f43c81acce6a975a7
    binding_hash: dcca720b40783363c91c6497dc2da7f69313934c7df514ad35281bf500a4ba50
    fingerprint: 8cf53c0708d1d93373872d14cb1d860cd9fb5ca363abba6529bea8828b93381d
    fingerprint_components:
      contract: ee3345fd5a4082bfe8e39998d216422515fbb41e792cf79f43c81acce6a975a7
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
      - symbol_id: SYM-proof-skill-resource-max-bytes
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
      test_id: TEST-proof-skill-resource-max-bytes
      variable: resource_max_bytes
      value_type: int
      assumptions:
        - operator: eq
          value: 131072
      claim:
        operator: eq
        value: 131072
    certificate_digest: 766b8f10bf0e2be2c2be4cc3c87e15d203fcf375fb075058d82bcf64ab9e6634
    claim_bindings:
      - claim_key: CLAIM-8A9C68E905170BC4
        requirement_id: REQ-skill-file-limits
        fact_id: FACT-skill-resource-max-bytes
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 131072
          value_type: int
          variable: resource_max_bytes
---
Proves that a skill resource shall be at most 131072 bytes, against the code Kibi reads at ingest.