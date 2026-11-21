---
title: The entity schema declares exactly eight entity types, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:19:00.083Z'
id: TEST-proof-entity-type-count
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-proof-entity-type-count
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - source:
        reader: json
        file: packages/cli/src/schemas/entity.schema.json
        path: /properties/type/enum
        select: items
      measure: count
  proves:
    - CLAIM-CEF6FA16BAA4B3D3
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6a13f84a078f33de7984f0bb
    test_id: TEST-proof-entity-type-count
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: dea87cb10e190cb6b7fe51eb1085dd79d77e3d1526e114ea062cd37d99264e98
    binding_hash: b825dab38d81ab18e74239502a1d1f2e24da69fae0ded9e09ce5bc027c03d331
    fingerprint: 53eb2ef79e677b0253e6f69287dc9516ac3b2c6b7e24da3dcc382008b4b0d187
    fingerprint_components:
      contract: dea87cb10e190cb6b7fe51eb1085dd79d77e3d1526e114ea062cd37d99264e98
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
      - symbol_id: SYM-test-proof-entity-type-count
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
      test_id: TEST-proof-entity-type-count
      variable: entity_type_count
      value_type: int
      assumptions:
        - operator: eq
          value: 8
      claim:
        operator: eq
        value: 8
    certificate_digest: e80dc87d5146ddc47196769d13ac32d0bc63d9a0a07eaf90f461e44b48c9e38e
    claim_bindings:
      - claim_key: CLAIM-CEF6FA16BAA4B3D3
        requirement_id: REQ-004
        fact_id: FACT-ENTITY-TYPES-CORE-7
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 8
          value_type: int
          variable: entity_type_count
---
Proves that the KB schema supports exactly eight entity types: Kibi counts the type enum of the entity schema itself and decides the count claim exactly.