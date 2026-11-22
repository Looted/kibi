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
    receipt_id: PR-1fbfb2acd4a06abdd2fde19e
    test_id: TEST-proof-entity-type-count
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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