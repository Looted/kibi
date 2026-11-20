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
    receipt_id: PR-a7f3b60d6531c5dd1111accb
    test_id: TEST-proof-skill-resource-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ee3345fd5a4082bfe8e39998d216422515fbb41e792cf79f43c81acce6a975a7
    binding_hash: 6c905484528c292617c0b901c996e14c395c5f49899bcd261d590d1fb2d3b424
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